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
	client.execute("insert into group_cata (id,groupid,name,createtime) values (?,?,?,?)",[groupuuid,groupuuid,name,Date.parse(new Date())/1000],function(err,result){
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
		client.execute("insert into group (id,name,public,createtime,owner,description) values (?,?,?,?,?,?)",[groupuuid,name,freejoin,Date.parse(new Date())/1000,req.session.uuid,""],function(err,result2){
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
			client.execute("insert into group_member (groupid,userid,type) values (?,?,?)",[groupuuid,req.session.uuid,4],function(err,result3){})
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
			var member=0;
			if (req.session.uuid!=undefined && req.session.uuid!="")
			{
				client.execute("select * from group_member where groupid=? and userid=?",[req.param('id'),req.session.uuid],function(err,result2){
					if (err)
					{
						console.error(err)
					}
					if (result2.rows.length>0)
					{
						member=result2.rows[0].type;
					}
					if (req.session.uuid==result.rows[0].owner)
					{
						member=4
					}
					app.render("group_i",{group:result.rows[0],catas:catas,member:member},function(err,html){
						if (err)
						{
							console.error(err)
							res.send("发生了一些错误3")
							return
						}
						res.send(html)
					})
				})
			} else
			{
				app.render("group_i",{group:result.rows[0],catas:catas,member:member},function(err,html){
					if (err)
					{
						console.error(err)
						res.send("发生了一些错误3")
						return
					}
					res.send(html)
				})
			}
			
			
		})
	})
})

router.post("/modigroupsave/:id",bodyparser.urlencoded({ extended: false }),function(req,res){
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
	client.execute("select * from group where id=?",[req.param('id')],function(err,result){
		if (err)
		{
			console.error(err)
			app.render("error",{msg:"发生内部错误",page:"上一页",pageurl:"javascript:history.go(-1)"},function(err,html){
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
		if (result.rows.length<1)
		{
			app.render("error",{msg:"参数错误，没有这个社群",page:"社群首页",pageurl:"http://www.itsounds.cool/group/index"},function(err,html){
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
		
		if (result.rows[0].owner!=req.session.uuid)
		{
			app.render("error",{msg:"这不是您的社群，无权修改",page:"社群"+result.rows[0].name,pageurl:"http://www.itsounds.cool/group/i/"+result.rows[0].id},function(err,html){
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
		var name="";
		var freejoin=0;
		var desc="";
		var photo=result.rows[0].photo;
		try
		{
			name=req.body.group_name.replace(/(^\s*)|(\s*$)/g,"");
			if (req.body.freejoin!=undefined)
			{
				freejoin=1;
			}
			desc=req.body.group_desc.replace(/(^\s*)|(\s*$)/g,"");
			photo=req.body.modi_pic_url.replace(/(^\s*)|(\s*$)/g,"")
		}
		catch (e)
		{
		
		}
		if (photo.length==0)
		{
			photo=result.rows[0].photo;
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
		client.execute("update group set name=?,description=?,photo=?,public=? where id=?",[name,desc,photo,freejoin,result.rows[0].id],function(err,result1){
			if (err)
			{
				console.error(err)
			}
			res.redirect("/group/i/"+result.rows[0].id);
		})
	})
})

router.post("/newcata/:id",bodyparser.urlencoded({ extended: false }),function(req,res){
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		res.send("not logined");
		return 
	}
	if (req.body.name==undefined || req.body.name.replace(/(^\s*)|(\s*$)/g,"").length<1)
	{
		res.send("name not good");
		return 
	}
	if (req.body.name.replace(/(^\s*)|(\s*$)/g,"").length>20)
	{
		res.send("name too long");
	}
	client.execute("select * from group where id=?",[req.param('id')],function(err,result){
		if (err)
		{
			console.error(err)
			res,send("internal err1")
			return 
		}
		if (result.rows.length<1)
		{
			res.send("param err")
			return 
		}
		
		if (result.rows[0].owner!=req.session.uuid)
		{
			res.send("not owner")
			return 
		}
		var uid=uuid.v4();
		client.execute("insert into group_cata (id,createtime,groupid,name) values (?,?,?,?)",[uid,Date.parse(new Date())/1000,result.rows[0].id,req.body.name.replace(/(^\s*)|(\s*$)/g,"")],function(err,result1){
			if (err)
			{
				console.error(err)
				res.send("internal err2")
				return 
			}
			res.send("ok"+uid);
		})
	})
})

router.get("/delcata/:id/:cata",function(req,res){
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		res.send("not logined");
		return 
	}
	client.execute("select * from group where id=?",[req.param('id')],function(err,result){
		if (err)
		{
			console.error(err)
			res,send("internal err1")
			return 
		}
		if (result.rows.length<1)
		{
			res.send("param err")
			return 
		}
		
		if (result.rows[0].owner!=req.session.uuid)
		{
			res.send("not owner")
			return 
		}
		client.execute("select * from group_cata where id=?",[req.param('cata')],function(err,result1){
			if (err)
			{
				console.error(err)
				res.send("internal err2")
				return 
			}
			if (result1.rows.length<1 || result1.rows[0].groupid!=req.param('id') || result1.rows[0].is_primary==1)
			{
				res.send("param err2")
				return 
			}
			client.execute("select count(*) from group_cata where groupid=?",[req.param('id')],function(err,result2){
				if (err)
				{
					console.error(err)
					res.send("internal err3")
					return
				}
				if (result2.rows.length<1)
				{
					console.error(err)
					res.send("internal err4")
					return
				}
				if (result2.rows[0].count<2)
				{
					client.execute("insert into group_cata (id,createtime,groupid,name) values (?,?,?,?)",[uuid.v4(),Date.parse(new Date())/1000,req.param('id'),'默认分类'],function(err,result3){
						if (err)
						{
							console.error(err)
							res.send("internal err6")
							return 
						}
						client.execute("delete from group_cata where id=?",[req.param('cata')],function(err,result3){
						if (err)
							{
								console.error(err)
								res.send("internal err7")
								return 
							}
							res.send("ok")
						})
					})
				} else
				{
					client.execute("delete from group_cata where id=?",[req.param('cata')],function(err,result3){
						if (err)
						{
							console.error(err)
							res.send("internal err5")
							return 
						}
						res.send("ok")
					})
				}
			})
		})
	})
})

router.post("/modicata/:id/:cata",bodyparser.urlencoded({ extended: false }),function(req,res){
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		res.send("not logined");
		return 
	}
	if (req.body.name==undefined || req.body.name.replace(/(^\s*)|(\s*$)/g,"").length<1)
	{
		res.send("name not good");
		return 
	}
	if (req.body.name.replace(/(^\s*)|(\s*$)/g,"").length>20)
	{
		res.send("name too long");
	}
	client.execute("select * from group where id=?",[req.param('id')],function(err,result){
		if (err)
		{
			console.error(err)
			res,send("internal err1")
			return 
		}
		if (result.rows.length<1)
		{
			res.send("param err")
			return 
		}
		
		if (result.rows[0].owner!=req.session.uuid)
		{
			res.send("not owner")
			return 
		}
		client.execute("select * from group_cata where id=?",[req.param('cata')],function(err,result1){
			if (err)
			{
				console.error(err)
				res.send("internal err2")
				return 
			}
			if (result1.rows.length<1 || result1.rows[0].groupid!=req.param('id') )
			{
				res.send("param err2")
				return 
			}
			client.execute("update group_cata set name=? where id=?",[req.body.name.replace(/(^\s*)|(\s*$)/g,""),req.param('cata')],function(err,result2){
				if (err)
				{
					console.error(err)
					res.send("internal err3")
					return 
				}
				res.send("ok")
			})
		})
	})
})

router.post("/posttext/:id/:cata",bodyparser.urlencoded({ extended: false }),function(req,res){
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		res.send("not logined");
		return 
	}
	if (req.body.nr==undefined || req.body.nr.replace(/(^\s*)|(\s*$)/g,"").length<1)
	{
		res.send("empty");
		return 
	}
	if (req.body.nr.replace(/(^\s*)|(\s*$)/g,"").length>20000)
	{
		res.send("nr too long");
	}
	client.execute("select * from group_member where groupid=? and userid=?",[req.param("id"),req.session.uuid],function(err,result1){
		if (err)
		{
			console.error(err)
			res.send("internal err1")
			return 
		}
		if (result1.rows.length<1 || result1.rows[0].type<2)
		{
			res.send("not member")
			return 
		}
		client.execute("select * from group_cata where id=?",[req.param("cata")],function(err,result2){
			if (err)
			{
				console.error(err)
				res.send("internal err2")
				return 
			}
			if (result2.rows.length<1 || result2.rows[0].groupid!=req.param("id"))
			{
				res.send("param error")
				return 
			}
			client.execute("select * from users where userid=?",[req.session.uuid],function(err,result3){
				if (err)
				{
					console.error(err)
					res.send("internal err5")
					return 
				}
				if (result3.rows.length<1)
				{
					res.send("internal err6")
					return 
				}
				client.execute("select * from group where id=?",[req.param("id")],function(err,result4){
					if (err)
					{
						console.error(err)
						res.send("internal err7")
						return 
					}
					if (result4.rows.length<1)
					{
						res.send("internal err8")
						return 
					}
					client.execute("insert into group_item (cataid,createtime,commentnum,groupname,text,type,userid,username,userphoto,usertype) values (?,?,?,?,?,?,?,?,?,?)",[req.param("cata"),Date.parse(new Date())/1000,0,result4.rows[0].name,req.body.nr.replace(/(^\s*)|(\s*$)/g,""),1,result3.rows[0].userid,result3.rows[0].username,result3.rows[0].photo,result1.rows[0].type],function(err,result5){
						if (result4.rows.length<1)
						{
							res.send("internal err8")
							return 
						}
						var resulttosent={}
						resulttosent.cataid=req.param("cata")
						resulttosent.cataname=result2.rows[0].name;
						resulttosent.nr=req.body.nr.replace(/(^\s*)|(\s*$)/g,"")
						resulttosent.type=1;
						resulttosent.time=Date.parse(new Date())/1000;
						resulttosent.userid=result3.rows[0].userid;
						resulttosent.username=result3.rows[0].username
						resulttosent.userphoto=result3.rows[0].photo
						resulttosent.usertype=result1.rows[0].type
						res.send(resulttosent)
					})
				})
			})
		})
	})
})

router.get("/applyjoin/:id",function(req,res){
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		res.send("not logined")
		return 
	}
	client.execute("select * from group where id=?",[req.param("id")],function(err,result){
		if (err)
		{
			console.error(err)
			res.send("internal err1")
			return 
		}
		if (result.rows.length<1)
		{
			res.send("param err")
			return
		}
		client.execute("select * from group_member where groupid=? and userid=?",[req.param("id"),req.session.uuid],function(err,result1){
			if (err)
			{
				console.error(err)
				res.send("internal err2")
				return 
			}
			if (result1.rows.length>0)
			{
				if (result1.rows[0].type==1)
				{
					if (result.rows[0].public==1)
					{
						client.execute("update group_member set type=? where groupid=? and userid=?",[2,req.param("id"),req.session.uuid],function(err,result2){
							if (err)
							{
								console.error(err)
								res.send("internal err3")
								return 
							}
							res.send("already joined")
						})
						return
					}
					res.send('already applied')
					return 
				}
				res.send('already joined')
				return 
			}
			if (result.rows[0].public==1)
			{
				client.execute("insert into group_member (groupid,userid,type) values (?,?,?)",[req.param("id"),req.session.uuid,2],function(err,result3){
					if (err)
					{
						console.error(err)
						res.send("internal err4")
						return 
					}
					res.send("already joined")
				})
				return 
			}
			client.execute("insert into group_member (groupid,userid,type) values (?,?,?)",[req.param("id"),req.session.uuid,1],function(err,result3){
				if (err)
				{
					console.error(err)
					res.send("internal err5")
					return 
				}
				res.send("already applied")
			})
		})
	})
})

exports.router=router;