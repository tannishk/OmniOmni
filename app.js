/*jshint node:true*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as it's web server
// for more info, see: http://expressjs.comvar express = require('express'),
var express = require('express'),
    cfenv = require('cfenv'),
    bodyParser = require('body-parser'),
    bluemix = require('./config/bluemix'),
    url = require('url'),
    https = require('https'),
    extend = require('util')._extend;

    /**
     * @module WordCount
     */

    var WordCount = function() {
    };

    /*
     * Find number of words in given text.
     */
    WordCount.wordsInText = function(text) {
        if (!text) {
            // There is no text.
            return 0;
        }

        text = text.trim(); // Clear ends.
        var split = text.split(/\s+/g);
        if (split.length === 1) {
            if (split[0].trim() === '') {
                return 0;
            } else {
                return 1;
            }
        } else {
            return split.length;
        }
    };

    /*
     * Find number of chars in given text.
     */
    WordCount.charsInText = function(text) {
        if (!text) {
            return 0;
        }
        
        return text.length;
    };

    /*
     * Find number of lines in given text.
     */
    WordCount.linesInText = function(text) {
        if (text == null) {
	    // File contents null...zero lines
            return 0;
        }
        var matching = text.match(/\n/g);
        if (matching != null) {
            return matching.length;
        } else {
            // File has content but no newlines. If file is empty
	    // return zero lines, otherwise there is only a single line
	    if (text.trim().length == 0) {
		return 0;
	    } else {
		return 1;
	    }
        }
    };

function isSyllable(word) {
  word = word.toLowerCase();                                     //word.downcase!
  if(word.length <= 3) { return 1; }                             //return 1 if word.length <= 3
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');   //word.sub!(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  word = word.replace(/^y/, '');                                 //word.sub!(/^y/, '')
  word = word.match(/[aeiouy]{1,2}/g);
  if(word != null)
    return word.length;                    //word.scan(/[aeiouy]{1,2}/).size
  else
    return 0; 
}

function findFogIndex(text){
    var noOfWords = WordCount.wordsInText(text);
    var noOfSentences = WordCount.linesInText(text);
    var noOfComplexWords = 0;
    if(text){
        text = text.trim(); // Clear ends.
        var split = text.split(/\s+/g);
        for (str in split) {
            if(isSyllable(str) > 2) noOfComplexWords++;
        }
    }
    flesch_index = 0.39 * (noOfWords / noOfSentences) + (11.8 * noOfComplexWords) / noOfWords - 15.59;
    return 0.4 *( noOfWords / noOfSentences + (100 * noOfComplexWords) / noOfWords) ;
}

var AYLIENTextAPI = require('aylien_textapi');
var textapi = new AYLIENTextAPI({
  application_id: "2da6c99d",
  application_key: "e4a6158eb1d2942a6663ee14f353318f"
});

var fog_index = 0;
var flesch_index = 0;



// create a new express server
var app = express();

app.use(bodyParser.urlencoded({ extended: true }));

// Handle the form POST containing the question to ask Watson and reply with the answer
app.post('/analyser/', function(req, res){
    /*textapi.sentiment({ 'text': req.body.user}, function(error, response) {
        if(error === null){
          res.send(response);
      }
    });*/
    var category = null;
    var article = null;
    var hashtags = null;
    var answer1 = "<html><head><title>YUREKA</title><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" /><!--[if lte IE 8]><script src=\"assets/js/ie/html5shiv.js\"></script><![endif]--><link rel=\"stylesheet\" href=\"/assets/css/main.css\" /><!--[if lte IE 8]><link rel=\"stylesheet\" href=\"assets/css/ie8.css\" /><![endif]--><!--[if lte IE 9]><link rel=\"stylesheet\" href=\"assets/css/ie9.css\" /><![endif]--></head><body><div id=\"page-wrapper\"><header id=\"header\"><h1><a href=\"/\">YUREKA</a></h1><nav id=\"nav\"></nav></header><article id=\"main\"><header><h2>Result</h2></header><section class=\"wrapper style5\"><div class=\"inner\"><section>";
    var answer2 = "</div></section></body></html>";
    var answer = answer1;
    textapi.extract({"url": req.body.user}, function(error, response) {
        if(error === null){
          article = response.article;
          console.log("aaaa");
          fog_index = "" + findFogIndex(article) + "<br/>" + flesch_index;
          textapi.classify({"text" : article}, function(error, response) {
              if( error === null) {
                  category = "" + response.categories[0].label;
                  console.log("aaaabbbb");
                  textapi.hashtags({"text": article}, function(error, response) {
                      if(error === null){
                          console.log("aaaacccc");
                          hashtags = ("" + response.hashtags).split(",").join(", ");
                          textapi.summarize({"url" : req.body.user, "mode" : "short"}, function(error, response) {
                              if(error === null){
                                    article = "";
                                    console.log(response.sentences);
                                    for (str in response.sentences) {
                                        article += response.sentences[str];
                                    }
                                    if(category != null)
                                      answer += "<h4>Category</h4><div class=\"12u$\"><p name=\"demo-message\" id=\"demo-message\">" + category + "</p></div>";
                                    if(article != null)
                                        answer += "<h4>Summarized content</h4><div class=\"12u$\"><p name=\"demo-message1\" id=\"demo-message1\">" + article + "</p></div>";
                                    if(hashtags != null)
                                        answer += "<h4>Suggested Hashtag</h4><div class=\"12u$\"><p name=\"demo-message3\" id=\"demo-message3\">" + hashtags + "</p></div>";
                                    if(fog_index != null)
                                        answer += "<h4>Stats_For_Nerds</h4><div class=\"12u$\"><p name=\"demo-message\" id=\"demo-message\">" + "Fog index: " + fog_index + "</p>";
                                    res.send(answer);
                              }
                              else {
                                  if(category != null)
                                      answer += "<h4>Suggested Category:</h4><br/>" + category + "<br/>";
                                    if(article != null)
                                        answer += "<h4><br/> Content:</h4><br/>" + article + "<br/>";
                                    if(hashtags != null)
                                        answer += "<h4><br/> Suggested Hashtags:</h4><br/>" + hashtags + "<br/>";
                              }
                          });
                      }
                      else {
                          res.send("Failure");
                      }
                  });
              }
              else {
                  res.send("Some problem here")
              }
          });
        }
    });
});

// serve the files out of ./public as our main files
app.use('/',express.static(__dirname + '/public'));

app.get('/*',function(req,res) {
    res.send("The Page does not exist");
});

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port);