var express = require('express');
var uuid=require('node-uuid');
var session = require('express-session')
var cql = require('node-cassandra-cql');
var client = new cql.Client({hosts: ['108.61.218.214', '108.61.218.220'], keyspace: 'site',username:'xx',password:"xx123456&*("});
var router=express.Router();
var app = express();
var fs = require('fs');
var bodyparser=require("body-parser")
var multiparty = require('multiparty')
var upload=require("./upload.js");
app.use(bodyparser.urlencoded({ extended: false }))
app.use(bodyparser.json())
app.use(session({secret: 'this is it sounds cool', resave:true, saveUninitialized :true }));

router.get("/index",function(req,res){
	if (req.session.uuid==undefined || req.session.uuid=="")
	{
		res.send("您还木有登录，请去<a href=\"http://www.itsounds.cool/login\">登录</a>")
		return ;
	}
	client.execute("select * from users where userid=? ;",[req.session.uuid],function(err,result){
		if (err){
			res.send("发生了一些错误，请重试");
			return ;
		}
		if (result.rows.length>0) {
			var str="<p>登录成功！</p>";
			res.send(str)
		} else
		{
			var str="<p>登录失败！</p>"
			res.send(str)
		}
	})
})

exports.router=router