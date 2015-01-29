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
var qn=require("qn")

app.set('views', __dirname + '/views');
app.engine('html', ejs.__express);
app.set('view engine','html');
app.use(bodyparser.urlencoded({ extended: false }))
app.use(bodyparser.json())
router.get("/upload",function(req,res){
	app.render("picbedupload",{title:"图床(It Sounds Cool)",type:"upload",error:"",key:""},function(err,html){
		if (err)
		{
			console.log(err)
			return
		}
		res.send(html)
	})
})

router.post("/uploadsave",function(req,res){
	var form = new multiparty.Form({maxFilesSize:"2097152"});
	form.parse(req, function(err, fields, files) {
		try
		{
			fs.readFile((files.picbedpic)[0].path, function (err, data) {
				if (err) {
					console.log(err)
					app.render("picbedupload",{title:"图床(It Sounds Cool)",type:"error",error:"内部错误",key:""},function(err,html){
						if (err)
						{
							console.log(err)
							return
						}
						res.send(html)
					})
					return
				}
				var contentType=(files.picbedpic)[0].headers["content-type"]
				var fileSuffix=contentType.substring(contentType.indexOf("/")+1).toLowerCase()
				if (fileSuffix!="bmp" &&fileSuffix!="gif" &&fileSuffix!="jpg" &&fileSuffix!="jpeg" &&fileSuffix!="png")
				{
					app.render("picbedupload",{title:"图床(It Sounds Cool)",type:"error",error:"文件格式不是图片，请上传图片",key:""},function(err,html){
						if (err)
						{
							console.log(err)
							return
						}
						res.send(html)
					})
					return
				}
				var md5=crypto.createHash('md5')
				md5.update(data)
				var md5result=md5.digest('hex')
				client.execute("select * from pic where size=? and md5=?",[data.length,md5result],function(err,result){
					if (err)
					{
						app.render("picbedupload",{title:"图床(It Sounds Cool)",type:"error",error:"内部错误",key:""},function(err,html){
							if (err)
							{
								console.log(err)
								return
							}
							res.send(html)
						})
						return
					}
					if (result.rows.length>0)
					{
						var url=result.rows[0].url
						var domain="http://7u2r9x.com1.z0.glb.clouddn.com/";
						var key=url.substr(domain.length);
						app.render("picbedupload",{title:"图床(It Sounds Cool)",type:"key",error:"",key:key},function(err,html){
							if (err)
							{
								console.log(err)
								return
							}
							res.send(html)
						})
					} else
					{
						var qnclient = qn.create({
							accessKey: 'nj11VOHJP6gf2gPRLPD7xXyfvTx1nRYsCr2FLkEw',
							secretKey: 'pRzoGfOgQJVxzVKmE0CzCeo476WgrSL0czVjum8e',
							bucket: 'itsoundscool',
							domain: 'http://7u2r9x.com1.z0.glb.clouddn.com'
						});
						
						qnclient.upload(data,{key:"p"+md5result+(Date.parse(new Date())/1000).toString()+"."+fileSuffix}, function (err, upresult) {
							if (err)
							{
								app.render("picbedupload",{title:"图床(It Sounds Cool)",type:"error",error:"内部错误",key:""},function(err,html){
									if (err)
									{
										console.log(err)
										return
									}
									res.send(html)
								})
								return
							}
							if (upresult.url==undefined || upresult.url=="")
							{
								app.render("picbedupload",{title:"图床(It Sounds Cool)",type:"error",error:"内部错误",key:""},function(err,html){
									if (err)
									{
										console.log(err)
										return
									}
									res.send(html)
								})
								return
							}
							var url=upresult.url
							var domain="http://7u2r9x.com1.z0.glb.clouddn.com/";
							var key=url.substr(domain.length);
							app.render("picbedupload",{title:"图床(It Sounds Cool)",type:"key",error:"",key:key},function(err,html){
								if (err)
								{
									console.log(err)
									return
								}
								res.send(html)
							})
							client.execute("insert into pic (md5,size,uploadtime,url,id) values (?,?,?,?,?)",[md5result,data.length,Date.parse(new Date())/1000,upresult.url,uuid.v4()],function(err,result1){
								if (err)
								{
									console.error(err)
								}
							})
						});
					}
				})
			})
		}
		catch (e)
		{
			res.send("发生了错误："+e)
		}
    });
	
	form.on('error', function(err) {
		console.error('Error parsing form: ' + err.stack);
		app.render("picbedupload",{title:"图床(It Sounds Cool)",type:"error",error:"内部错误",key:""},function(err,html){
		if (err)
			{
				console.log(err)
				return
			}
			res.send(html)
		})
	});

})






exports.router=router;