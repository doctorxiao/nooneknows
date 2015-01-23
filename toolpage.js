var express = require('express');
var session = require('express-session')
var ejs=require("ejs")
var router=express.Router();
var app = express();
var bodyparser=require("body-parser")
var http=require("http");
app.set('views', __dirname + '/views');
app.engine('html', ejs.__express);
app.set('view engine','html');
app.use(bodyparser.urlencoded({ extended: false }))
app.use(bodyparser.json())
app.use(session({secret: 'this is it sounds cool', resave:true, saveUninitialized :true }));

router.get("/get/:url",function(req,res){
	if (req.param("url")==undefined || req.param("url").replace(/(^\s*)|(\s*$)/g,"").length<1)
	{
		res.send("error");
		return
	} 
	var url=req.param("url").replace(/(^\s*)|(\s*$)/g,"")
	var b = new Buffer(url, 'base64')
	var s = b.toString('utf8');
	res.send(s);
	http.get(s, function(resa) {
	    var size = 0;
		var chunks = [];
		res.on('data', function(chunk){
			size += chunk.length;
			chunks.push(chunk);
		});
		res.on('end', function(){
			var data = Buffer.concat(chunks, size);
			console.log(data.toString())
		});
	}).on('error', function(e) {
	    console.log("Got error: " + e.message);
		res.send("error")
	});
})

router.get("/avartar/:md5/:url/:size",function(req,res){
	var str="http://www.gravatar.com/avatar/"+req.param("md5").toLowerCase()+"?d="+req.param("url")+"&s="+req.param("size");
	http.get(str, function(resa) {
		resa.on("data",function(d){
			res.write(d)
		})
		resa.on("end",function(){
			res.end()
		})
		resa.on("error",function(){
			res.end()
		})
	}).on('error', function(e) {
		console.log("Got error: " + e.message);
	});
})


exports.router=router;