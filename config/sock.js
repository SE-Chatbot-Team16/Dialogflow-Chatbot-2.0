var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var db = require('./connection');
var api = require('./api');
var mongoose = require('mongoose');
var preco, isPaper = false;
//return from server and pass to botui
var fromClient = function(socket) {
    socket.on('fromClient', function (data) {
      api.getRes(data.client).then(function(res){
        var cond;
        mongoose.connection.readyState == 1 ?  cond = true :  cond = false;
          //Get all papers
          if(res.result.parameters.Course){
            if(cond) {
              var x = "<br>";
              db.find({})
              .exec()
              .then(docs => {
                for (var i in docs) {
                  x += docs[i].name + "<br>";
                }
                var result = res.result.fulfillment.speech + x;
                socket.emit('fromServer', { server: result });
                return docs;
              })//end then
              .catch(err => {console.log(err);});
            } else {
              console.log('error');
            }//end if
          }
          //Loop through all paper
          db.find({})
          .exec()
          .then(docs => {
            for(let i in docs) {
              //Check if paper is in the system
              if(res.result.parameters.Paper == docs[i].name) {
                isPaper = true;
                if(res.result.parameters.Requisites == 'pre') {
                  preco = true;
                  getRequisite(res,socket, docs[i]);
                }else if (res.result.parameters.Requisites == 'co') { //Get Co
                  preco = false
                  getRequisite(res,socket, docs[i]);
                }else if (res.result.parameters.Year || res.result.parameters.Semester || res.result.parameters.Location) {
                  getYearSemesterLocation(res, socket, docs[i]);
                }else if (res.result.metadata.intentName == "FailPaper") {
                  getFailPaper(res, socket, docs[i]);
                }else if (res.result.parameters.recommendPaper) {
                  getRecommendPaper(res, socket, docs[i]);
                }
                break;
              }
              else {
                isPaper = false;
              }
            }//end for
            if(isPaper == false) {
              socket.emit('fromServer', { server: res.result.fulfillment.speech });
            }

          }).catch(err => {console.log(err);});

      });//end api.getRes()
    });//end socket.on
};//end function

//Get Pre and Co requisites
var getRequisite = function (res,socket, docs) {
  if(preco) {
    var result = res.result.fulfillment.speech + " " + docs.pre;
  }else {
    var result = res.result.fulfillment.speech + " " + docs.co;
  }
  socket.emit('fromServer', { server: result });
};

//Get year, semester, location
var getYearSemesterLocation = function (res, socket,docs) {
  if(res.result.parameters.Year){ //Year
    var result = res.result.fulfillment.speech + " " + docs.year;
  }else if (res.result.parameters.Semester) {//Semester
    var result = res.result.fulfillment.speech + " " + docs.semester;
  }else if (res.result.parameters.Location) {//Location
    var result = res.result.fulfillment.speech + " " + docs.location;
  }
  socket.emit('fromServer', { server: result });
};

//Get fail paper
var getFailPaper = function(res, socket, docs) {
  //check paper isCore
  if(docs.core == 'core') {
    result = ", You have to redo " + res.result.parameters.Paper + " because it's a core paper ";
  }else {
    result = ", You can take other 15 points from elective paper from the current year of study ";
  }
  //get code of the fail paper
  code = docs.code;
  //loop through all the papers
  var result__ , result_;
  db.find({})
  .exec()
  .then(lines => {
    var result_ = ", You can't take these paper: ";
    var bln;
    for(let i in lines) {
      var pre = lines[i].pre;
      if(pre.includes(code)) {
        bln = true;
        result_ += "[ " + lines[i].code + " " + lines[i].name + " ] ";
      }
    }
    if(bln) {
      socket.emit('fromServer', { server: res.result.fulfillment.speech + result + result_});
    }else {
      socket.emit('fromServer', { server: res.result.fulfillment.speech + result });
    }
  }).catch(err => {console.log(err);});
}

//Get Recommend Paper
var getRecommendPaper = function(res, socket, docs) {
  var yearstudy = docs.yearstudy;
  var result = "";
  db.find({})
  .exec()
  .then(lines => {
    for(let i in lines) {
      if(lines[i].yearstudy == yearstudy) {
        result += " [" + lines[i].code + " " + lines[i].name + "] ";
      }
    }
    socket.emit('fromServer', { server: res.result.fulfillment.speech + result });
  }).catch(err => {console.log(err);});
}

module.exports = {fromClient}
