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
var url=require('url');
var event=require("events")
var sizeOf = require('image-size');
var http=require("http")
var router=express.Router();
var app = express();
var crypto=require("crypto")
var dgram=require('dgram')
app.set('views', __dirname + '/views');
app.engine('html', ejs.__express);
app.set('view engine','html');
app.use(bodyparser.urlencoded({ extended: false }))
app.use(bodyparser.json())
app.use(session({secret: 'this is it sounds cool', resave:true, saveUninitialized :true }));


router.get("/index",function(req,res){
	var login=false;
	var userid="";
	if (req.session.uuid!=undefined && req.session.uuid!="0" && req.session.uuid!="")
	{
		login=true;
		userid=req.session.uuid;
	}
	app.render("group_index",{login:login,userid:userid},function(err,html){
		if (err)
		{
			console.error(err)
			res.send("发生了一些错误")
			return
		}
		res.send(html)
	})
})

router.post("/newgroupsave",bodyparser.urlencoded({ extended: false }),function(req,res){
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		app.render("error",{msg:"您没有登录，不能创建新的社群",page:"登录页",pageurl:"http://www.itsounds.cool/login"},function(err,html){
			if (err)
			{
				console.error(err)
				res.send("发生了一些错误1")
				return
				}
			res.send(html)
		})
		return 
	}
	var name="";
	var freejoin=0;
	try
	{
		name=req.body.group_name.replace(/(^\s*)|(\s*$)/g,"");
		if (req.body.freejoin!=undefined)
		{
			freejoin=1;
		}
	}
	catch (e)
	{
	
	}
	if (name.length<1)
	{
		app.render("error",{msg:"新的社群名字不能为空",page:"社群首页",pageurl:"http://www.itsounds.cool/group/index"},function(err,html){
			if (err)
			{
				console.error(err)
				res.send("发生了一些错误2")
				return
				}
			res.send(html)
		})
		return 
	}
	if (name.length>30)
	{
		app.render("error",{msg:"新的社群名字不能太长",page:"社群首页",pageurl:"http://www.itsounds.cool/group/index"},function(err,html){
			if (err)
			{
				console.error(err)
				res.send("发生了一些错误3")
				return
				}
			res.send(html)
		})
		return 
	}
	var groupuuid=uuid.v4();
	client.execute("insert into group_cata (id,groupid,is_primary,name,createtime) values (?,?,?,?,?)",[groupuuid,groupuuid,1,name,Date.parse(new Date())/1000],function(err,result){
		if (err)
		{
			console.error(err)
			app.render("error",{msg:"发生内部错误1",page:"社群首页",pageurl:"http://www.itsounds.cool/group/index"},function(err,html){
				if (err)
				{
					console.error(err)
					res.send("发生了一些错误4")
					return
					}
				res.send(html)
			})
			return 
		}
		client.execute("insert into group (id,name,public,createtime,owner) values (?,?,?,?,?)",[groupuuid,name,freejoin,Date.parse(new Date())/1000,req.session.uuid],function(err,result2){
			if (err)
			{
				console.error(err)
				app.render("error",{msg:"发生内部错误2",page:"社群首页",pageurl:"http://www.itsounds.cool/group/index"},function(err,html){
					if (err)
					{
						console.error(err)
						res.send("发生了一些错误5")
						return
						}
					res.send(html)
				})
				return 
			}
			res.redirect("http://www.itsounds.cool/group/i/"+groupuuid)
		})
	})
})

router.get("/i/:id",function(req,res){
	client.execute("select * from group where id=?",[req.param('id')],function(err,result){
		if (err)
		{
			console.error(err)
			app.render("error",{msg:"发生内部错误1",page:"社群首页",pageurl:"http://www.itsounds.cool/group/index"},function(err,html){
				if (err)
				{
					console.error(err)
					res.send("发生了一些错误1")
					return
				}
				res.send(html)
			})
			return 
		}
		if (result.rows.length<1)
		{
			app.render("error",{msg:"参数错误，不存在这个社群",page:"社群首页",pageurl:"http://www.itsounds.cool/group/index"},function(err,html){
				if (err)
				{
					console.error(err)
					res.send("发生了一些错误2")
					return
				}
				res.send(html)
			})
			return 
		}
		var catas=[];
		client.execute("select * from group_cata where groupid=?",[req.param('id')],function(err,result1){
			if (err)
			{
				console.error(err)
				return 
			}
			for(var i=0;i<result1.rows.length;i++)
			{
				if (result1.rows[i].is_primary!=1)
				{
					catas.push(result1.rows[i])
				}
			}
			app.render("group_i",{group:result.rows[0],catas:catas},function(err,html){
				if (err)
				{
					console.error(err)
					res.send("发生了一些错误3")
					return
				}
				res.send(html)
			})
		})
	})
})


exports.router=router;