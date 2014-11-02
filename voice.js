var express = require('express');
var uuid=require('node-uuid');
var session = require('express-session')
var config=require("./config.js").config;
var cql = require('node-cassandra-cql');
var ejs=require("ejs")
var client = new cql.Client(config.cassandra);
var multiparty = require('multiparty')
var util = require('util')
var fs = require('fs');
var router=express.Router();
var app = express();
app.set('views', __dirname + '/views');
app.engine('html', ejs.__express);
app.set('view engine','html');
router.get("/record",function(req,res){
	app.render("recorder",{},function(err,html){
		if (err)
		{
			console.log(err)
			return
		}
		res.send(html)
	})
})

router.post("/sendaudio",function(req,res){
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
						res.send("<audio src=\""+result.rows[0].url+"\"></audio>")
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
								res.send("<audio src=\""+result1.objectUrl+"\"></audio>")
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

exports.router=router;

