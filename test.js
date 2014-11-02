var express = require('express');
var uuid=require('node-uuid');
var session = require('express-session')
var config=require("./config.js").config;
var upload=require("./upload.js");
var cql = require('node-cassandra-cql');
var ejs=require("ejs")
var client = new cql.Client(config.cassandra);
var bodyparser=require("body-parser")
var multiparty = require('multiparty')
var util = require('util')
var fs = require('fs');
var router=express.Router();
var app = express();
var crypto=require("crypto")
app.set('views', __dirname + '/views');
app.engine('html', ejs.__express);
app.set('view engine','html');
app.use(bodyparser.urlencoded({ extended: false }))
app.use(bodyparser.json())

app.post("/sendaudio",function(req,res){
	var form = new multiparty.Form();
	form.parse(req, function(err, fields, files) {
		try
		{
			fs.readFile((files.audionr)[0].path, function (err, data) {
				if (err) {
					console.log(err)
					return
				}
				var tupload={}
				tupload.buffer=data
				tupload.contentType=(files.audionr)[0].headers["content-type"]
				if (tupload.contentType!="audio/mpeg")
				{
					res.send("格式不是Mp3")
					return
				}
				tupload.fileSuffix="mp3"
				tupload.is_Pic=false
				var md5=crypto.createHash('md5')
				md5.update(data)
				var md5result=md5.digest('hex')
				client.execute("select * from voice where size=? and md5=?",[data.length,md5result],function(err,result){
					if (err)
					{
						return
					}
					if (result.rows.length>0)
					{
						res.send("URL:"+result.rows[0].url)
					} else
					{
						upload.uploadBuffer(tupload,function(err,result1){
							if (err)
							{
								console.log(err)
								res.send("上传遇到问题")
								return 
							}
							if (result1.status!=undefined && result1.status==200 && result1.objectUrl!=undefined)
							{
								res.send("URL:"+result1.objectUrl)
								client.execute("insert into voice (size,md5,url,uploadtime) values (?,?,?,?)",[data.length,md5result,result1.objectUrl,Date.parse(new Date())/1000],function(err,result2){
									console.log(err)
								})
							}
						})
					}
				})
			})
		}
		catch (e)
		{
			
			res.send("发生了错误："+e)
		}
	})
})

var server = app.listen(80, function() {
    console.log('Listening on port %d', server.address().port);
});