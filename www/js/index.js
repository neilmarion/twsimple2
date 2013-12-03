/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
        app.readyTwitter();
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    },
    readyTwitter: function() {
      cb.setConsumerKey("Qm0bF6mkfDmFufAc28gYw", "jKCu1DUo2V0qGheL0smR9f98GbtQiHUjIULGDpP4");
      var id;
      // check if we already have access tokens
      if(localStorage.accessToken && localStorage.tokenSecret) {
        // then directly setToken() and read the timeline
        cb.setToken(localStorage.accessToken, localStorage.tokenSecret);
        showHomeTimeline(20);
        cb.__call(
          "statuses_mentionsTimeline", {"count": "1"},
          function (reply) {
            for(var key in reply){
              autoReply(reply[key].id, reply[key].user["screen_name"]); // auto reply to the tweet where I'm mentioned.
              id = reply[key].id;
            }
          }           
        );
        
        // now poll periodically and send an auto-reply when we are mentioned.
        fetchTweets(id);
      } else { // authorize the user and ask her to get the pin.
        cb.__call(
          "oauth_requestToken",
              {oauth_callback: "http://localhost/"},
              function (reply) {
              // nailed it!
                  cb.setToken(reply.oauth_token, reply.oauth_token_secret);
                  cb.__call(
                  "oauth_authorize",  {},
                  function (auth_url) {
                    var ref = window.open(auth_url, '_blank', 'location=no'); // redirection.
                    // check if the location the phonegap changes to matches our callback url or not
                    ref.addEventListener("loadstart", function(iABObject) {
                      if(iABObject.url.match(/localhost/)) {
                        ref.close();
                        authorize(iABObject);
                      }
                    });                 
                  }
            );
              }
        );
      }
    }


};

var cb = new Codebird; // we will require this everywhere
var interval; // for setting intervals.
 
 
/* thanks to  amwelles / widget.html (https://gist.github.com/amwelles/5776750)
 * for the following function.
 * simple and elegant.
 */
 
function parseText(text) {
    var link = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
  var user = /@(\w+)/ig;
  var hashTags = /#(\w+)/ig;
  var desc = "";
  if(link) {
    desc = text.replace(link,'<a href="$1" target="_blank">$1</a>');
  } if(user) {
    desc = desc.replace(user,'<a href="https://twitter.com/$1" target="_blank">@$1</a>');
  } if(hashTags) {
    desc = desc.replace(hashTags,'<a href="https://twitter.com/search?q=%23$1" target="_blank">#$1</a>');
  }
  return desc;
}
 
function showHomeTimeline(count) {
  cb.__call(
    "statuses_homeTimeline", {"count": count},
    function(reply) {
      for (var key in reply) {
        $('#homeTimeline').prepend('<li><p>' + reply[key].user["screen_name"] +': ' + parseText(reply[key].text) +'</p></li>');
      }
    }
  );
}
 
function showUserTimeline() {
  cb.__call(
    "statuses_userTimeline", {"count": "5"}, 
    function(reply) {
      for (var key in reply) {
        $('#userTimeline').prepend('<li><p>' + reply[key].user["screen_name"] +': ' + parseText(reply[key].text) +'</p></li>');
      }
    }
  );
}
 
function autoReply(id, name) {
  var params = {
    "in_reply_to_status_id": id,
    "status": "@" + name + " Hi, I'm driving, I'll get back to you ASAP!"
  };
  cb.__call(
    "statuses_update", params,
    function(reply) {
      // something will go here
    }
  );
}
 
function fetchTweets(id) {
  $.ajaxSetup({
    cache: false
  });
  var params = {
    "include_rts": "1",
    "count": "5",
    "since_id": id
  };
  var home = setInterval(function() {showHomeTimeline(5)}, 300000);
  // get at most five most recent mentions.
  var ref = setInterval(
    function() {
      cb.__call(
        "statuses_mentionsTimeline", params,
        function (reply) {
          if(reply){
            for(var key in reply){
              autoReply(reply[key].id, reply[key].user["screen_name"]); // auto reply to the tweet where I'm mentioned.
            }
          }
        }
      );
  }, 300000);
}
 
function loadOption(href, id) {
  // load the page irrespective of what it is.
  $('#LoadMe').load(href).hide().fadeIn("slow");
  // then check what it is and load the content accordingly.
  if(Number(id) == 1) {
    clearInterval(interval);
    showHomeTimeline(5);
    interval = setInterval(function() {showHomeTimeline()}, 300000);
  } else if(Number(id) == 2) {
    clearInterval(interval);
    showUserTimeline();
    interval = setInterval(function() {showUserTimeline()}, 300000);
  } else {
    // this is a placeholder for now.
  } 
}
 
function sendTweet() {
  var param = {"status": $('#tweet').val()};
  cb.__call(
    "statuses_update", param,
    function(reply) {
      // somethimg here
    }
  );
  $('#LoadMe').load("me.html").hide().fadeIn("slow");
  showUserTimeline();
}
 
/**************************** Let the coding begin ****************************/
 
//function onLoad() {
//  document.addEventListener("deviceready", onDeviceReady, false);
//}
 
 
function authorize(o) {
  var currentUrl = o.url;
  var query = currentUrl.match(/oauth_verifier(.+)/);
    for (var i = 0; i < query.length; i++) {
      parameter = query[i].split("=");
      if (parameter.length === 1) {
          parameter[1] = "";
      }
  }
  cb.__call(
        "oauth_accessToken", {oauth_verifier: parameter[1]},
        function (reply) {
          cb.setToken(reply.oauth_token, reply.oauth_token_secret);
            localStorage.accessToken = reply.oauth_token;
            localStorage.tokenSecret = reply.oauth_token_secret;
            cb.__call(
        "statuses_homeTimeline", {},
        function (reply) {
          for (var key in reply) {
            $('#homeTimeline').append('<li><p>' + reply[key].user["screen_name"] +': ' + parseText(reply[key].text) +'</p></li>');
          }
        }           
      );
        }
    );
    fetchTweets(null);
}
