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
router.get("/upload",function(req,res){
	app.render("picbedupload",{},function(err,html){
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
					return
				}
				var tupload={}
				tupload.buffer=data
				tupload.contentType=(files.picbedpic)[0].headers["content-type"]
				tupload.fileSuffix=tupload.contentType.substring(tupload.contentType.indexOf("/")+1).toLowerCase()
				if (tupload.fileSuffix!="bmp" &&tupload.fileSuffix!="gif" &&tupload.fileSuffix!="jpg" &&tupload.fileSuffix!="jpeg" &&tupload.fileSuffix!="png")
				{
					res.send("格式不是图片")
					return
				}
				tupload.is_Pic=true
				var md5=crypto.createHash('md5')
				md5.update(data)
				var md5result=md5.digest('hex')
				client.execute("select * from pic where size=? and md5=?",[data.length,md5result],function(err,result){
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
								client.execute("insert into pic (size,md5,url,uploadtime) values (?,?,?,?)",[data.length,md5result,result1.objectUrl,Date.parse(new Date())/1000],function(err,result2){
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
    });
	
	form.on('error', function(err) {
		console.log('Error parsing form: ' + err.stack);
	});

})






exports.router=router;