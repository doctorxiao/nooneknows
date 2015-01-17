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
		client.execute("insert into group_member (groupid,userid,type) values (?,?,?)",[groupuuid,req.session.uuid,4],function(err,result2){
			if (err)
			{
				console.error(err)
				app.render("error",{msg:"发生内部错误5",page:"社群首页",pageurl:"http://www.itsounds.cool/group/index"},function(err,html){
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
			
			client.execute("insert into group (id,name,public,createtime,owner,description) values (?,?,?,?,?,?)",[groupuuid,name,freejoin,Date.parse(new Date())/1000,req.session.uuid,""],function(err,result2){
				if (err)
				{
					console.error(err)
					app.render("error",{msg:"发生内部错误6",page:"社群首页",pageurl:"http://www.itsounds.cool/group/index"},function(err,html){
						if (err)
						{
							console.error(err)
							res.send("发生了一些错误6")
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
		return
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
					client.execute("insert into group_item (cataid,createtime,cataname,commentnum,groupname,text,type,userid,username,userphoto,usertype) values (?,?,?,?,?,?,?,?,?,?)",[req.param("cata"),Date.parse(new Date())/1000,result2.rows[0].name,0,result4.rows[0].name,req.body.nr.replace(/(^\s*)|(\s*$)/g,""),1,result3.rows[0].userid,result3.rows[0].username,result3.rows[0].photo,result1.rows[0].type],function(err,result5){
						if (result4.rows.length<1)
						{
							res.send("internal err9")
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

router.post("/postlink/:id/:cata",bodyparser.urlencoded({ extended: false }),function(req,res){
	var url="";
	var title="";
	var nr="";
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		res.send("not logined");
		return 
	}
	if (req.body.nr==undefined || req.body.url==undefined || req.body.title==undefined)
	{
		res.send("not full");
		return 
	}
	if (req.body.nr.replace(/(^\s*)|(\s*$)/g,"").length>20000)
	{
		res.send("nr too long");
		return
	}
	if (req.body.url.replace(/(^\s*)|(\s*$)/g,"").length>2000)
	{
		res.send("url too long");
		return
	}
	if (req.body.title.replace(/(^\s*)|(\s*$)/g,"").length>1000)
	{
		res.send("title too long");
		return
	}
	url=req.body.url.replace(/(^\s*)|(\s*$)/g,"")
	title=req.body.title.replace(/(^\s*)|(\s*$)/g,"")
	nr=req.body.nr.replace(/(^\s*)|(\s*$)/g,"")
	if (url.length==0 || title.length==0)
	{
		res.send("not full");
		return 
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
					client.execute("insert into group_item (cataid,createtime,cataname,commentnum,groupname,text,title,type,url,userid,username,userphoto,usertype) values (?,?,?,?,?,?,?,?,?,?,?,?,?)",[req.param("cata"),Date.parse(new Date())/1000,result2.rows[0].name,0,result4.rows[0].name,nr,title,2,url,result3.rows[0].userid,result3.rows[0].username,result3.rows[0].photo,result1.rows[0].type],function(err,result5){
						if (err)
						{
							console.error(err)
							res.send("internal err9")
							return 
						}
						if (result4.rows.length<1)
						{
							res.send("internal err9")
							return 
						}
						var resulttosent={}
						resulttosent.cataid=req.param("cata")
						resulttosent.cataname=result2.rows[0].name;
						resulttosent.nr=nr
						resulttosent.url=url
						resulttosent.title=title
						resulttosent.type=2;
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

router.post("/postpic/:id/:cata",bodyparser.urlencoded({ extended: false }),function(req,res){
	var nr="";
	var pic="";
	var pics=[];
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		res.send("not logined");
		return 
	}
	if (req.body.pic==undefined || req.body.pic.replace(/(^\s*)|(\s*$)/g,"").length<1)
	{
		res.send("no pic");
		return 
	}
	if (req.body.nr!=undefined && req.body.nr.replace(/(^\s*)|(\s*$)/g,"").length>20000)
	{
		res.send("nr too long");
		return
	}
	if (req.body.nr!=undefined )
	{
		nr=req.body.nr.replace(/(^\s*)|(\s*$)/g,"")
	}
	pic=req.body.pic.replace(/(^\s*)|(\s*$)/g,"")
	var picarray=pic.split(",")
	for(var i=0;i<picarray.length;i++)
	{
		if (picarray[i].replace(/(^\s*)|(\s*$)/g,"").length>0)
		{
			pics.push(picarray[i].replace(/(^\s*)|(\s*$)/g,""))
		}
	}
	if (pics.length<1)
	{
		res.send("no pic");
		return 
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
					client.execute("insert into group_item (cataid,createtime,cataname,commentnum,groupname,text,type,pics,userid,username,userphoto,usertype) values (?,?,?,?,?,?,?,?,?,?,?,?)",[req.param("cata"),Date.parse(new Date())/1000,result2.rows[0].name,0,result4.rows[0].name,nr,3,{value:pics, hint: 'set<varchar>'},result3.rows[0].userid,result3.rows[0].username,result3.rows[0].photo,result1.rows[0].type],function(err,result5){
						if (err)
						{
							console.error(err)
							res.send("internal err9")
							return 
						}
						if (result4.rows.length<1)
						{
							res.send("internal err9")
							return 
						}
						var resulttosent={}
						resulttosent.cataid=req.param("cata")
						resulttosent.cataname=result2.rows[0].name;
						resulttosent.nr=nr
						resulttosent.pics=pics
						resulttosent.type=3;
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

router.post("/postvideo/:id/:cata",bodyparser.urlencoded({ extended: false }),function(req,res){
	var nr="";
	var video="";
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		res.send("not logined");
		return 
	}
	if (req.body.video==undefined || req.body.video.replace(/(^\s*)|(\s*$)/g,"").length<1)
	{
		res.send("no video");
		return 
	}
	if (req.body.nr!=undefined && req.body.nr.replace(/(^\s*)|(\s*$)/g,"").length>20000)
	{
		res.send("nr too long");
		return
	}
	if (req.body.video!=undefined && req.body.video.replace(/(^\s*)|(\s*$)/g,"").length>20000)
	{
		res.send("video too long");
		return
	}
	if (req.body.nr!=undefined )
	{
		nr=req.body.nr.replace(/(^\s*)|(\s*$)/g,"")
	}
	if (req.body.video!=undefined )
	{
		video=req.body.video.replace(/(^\s*)|(\s*$)/g,"")
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
					client.execute("insert into group_item (cataid,createtime,cataname,commentnum,groupname,text,type,url,userid,username,userphoto,usertype) values (?,?,?,?,?,?,?,?,?,?,?,?)",[req.param("cata"),Date.parse(new Date())/1000,result2.rows[0].name,0,result4.rows[0].name,nr,4,video,result3.rows[0].userid,result3.rows[0].username,result3.rows[0].photo,result1.rows[0].type],function(err,result5){
						if (err)
						{
							console.error(err)
							res.send("internal err9")
							return 
						}
						if (result4.rows.length<1)
						{
							res.send("internal err9")
							return 
						}
						var resulttosent={}
						resulttosent.cataid=req.param("cata")
						resulttosent.cataname=result2.rows[0].name;
						resulttosent.nr=nr
						resulttosent.url=video
						resulttosent.type=4;
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
	client.execute("select * from users where userid=?",[req.session.uuid],function(err,result0){
		if (err)
		{
			console.error(err)
			res.send("internal err0")
			return
		}
		if (result0.rows.length<1)
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
					client.execute("insert into group_member (groupid,userid,type,username,userphoto) values (?,?,?,?,?)",[req.param("id"),req.session.uuid,2,result0.rows[0].username,result0.rows[0].photo],function(err,result3){
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
				client.execute("insert into group_member (groupid,userid,type,username,userphoto) values (?,?,?,?,?)",[req.param("id"),req.session.uuid,1,result0.rows[0].username,result0.rows[0].photo],function(err,result3){
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
})

router.post("/uploadpic",bodyparser.urlencoded({ extended: false,limit:"20480kb" }),function(req,res){
	if (req.body.b==undefined)
	{
		res.send("bad")
		return 
	}
	var posi=req.body.b.indexOf(",")
	var datax=req.body.b.substr(posi+1);
	var type=req.body.b.substring(5,posi-7)
	var data = new Buffer(datax, 'base64')
	var tupload={}
	tupload.buffer=data
	tupload.contentType=type
	tupload.fileSuffix=tupload.contentType.substring(tupload.contentType.indexOf("/")+1).toLowerCase()
	if (tupload.fileSuffix!="bmp" &&tupload.fileSuffix!="gif" &&tupload.fileSuffix!="jpg" &&tupload.fileSuffix!="jpeg" &&tupload.fileSuffix!="png")
	{
		res.send("bad")
		return
	}
	tupload.is_Pic=true
	var md5=crypto.createHash('md5')
	md5.update(data)
	var md5result=md5.digest('hex')
	var url="";
	client.execute("select * from pic where size=? and md5=?",[data.length,md5result],function(err,result){
		if (err)
		{
			res.send("bad")
			return
		}
		if (result.rows.length>0)
		{
			res.send(result.rows[0].url)
			return
		} else
		{
			upload.uploadBuffer(tupload,function(err,result1){
				if (err)
				{
					res.send("bad")
					return 
				}
				if (result1.status!=undefined && result1.status==200 && result1.objectUrl!=undefined)
				{
					url=result1.objectUrl
					client.execute("insert into pic (size,md5,url,uploadtime) values (?,?,?,?)",[data.length,md5result,result1.objectUrl,Date.parse(new Date())/1000],function(err,result2){
						if (err)
						{
							res.send("bad")
							return 
						}
						res.send(url)
						return 
					})
				}
			})
		}
	})
})

router.get("/modimember/:id/:uid/:type",function(req,res){
	if (req.session.uuid==undefined || req.session.uuid=="" || req.session.uuid=="0")
	{
		res.send("not logined")
		return 
	}
	var acttype=parseInt(req.param("type"))
	if (acttype!=0 && acttype!=2 && acttype!=3)
	{
		res.send("param error")
		return
	}
	client.execute("select * from group_member where groupid=? and userid=?",[req.param("id"),req.session.uuid],function(err,result){
		if (err)
		{
			res.send("internal err1")
			return 
		}
		if (result.rows.length<1)
		{
			res.send("not permision")
			return
		}
		if (acttype==0 || acttype==2)
		{
			if (result.rows[0].type<3)
			{
				res.send("param error")
				return
			}
		}
		if (acttype==3)
		{
			if (result.rows[0].type!=4)
			{
				res.send("param error")
				return
			}
		}
		client.execute("select * from group_member where groupid=? and userid=?",[req.param("id"),req.param("uid")],function(err,result1){
			if (err)
			{
				res.send("internal err2")
				return 
			}
			if (result1.rows.length<1)
			{
				res.send("param error")
				return
			}
			client.execute("update group_member set type=? where groupid=? and userid=?",[type,req.param("id"),req.param("uid")],function(err,result2){
				if (err)
				{
					res.send("internal err3")
					return 
				}
				res.send("ok")
			})
		})
	})
})

router.get("/getmember/:id/:type",function(req,res){
	if (req.session.uuid==undefined || req.session.uuid=="" || req.session.uuid=="0")
	{
		res.send("not logined")
		return 
	}
	var acttype=parseInt(req.param("type"))
	if (acttype<0 || acttype>4)
	{
		res.send("param error")
		return
	}
	client.execute("select * from group_member where groupid=? and userid=?",[req.param("id"),req.session.uuid],function(err,result){
		if (err)
		{
			res.send("internal err1")
			return 
		}
		if (result.rows.length<1)
		{
			res.send("not permision")
			return
		}
		client.execute("select * from group_member where groupid=? and type=? limit 50",[req.param("id"),acttype],function(err,result1){
			if (err)
			{
				res.send("internal err2")
				return 
			}
			if (result1.rows.length<1)
			{
				res.send("param error")
				return
			}
			var retosend=[]
			for (var i=0;i<result1.rows.length;i++)
			{
				var reobj={};
				reobj.userid=result1.rows[i].userid;
				reobj.username=result1.rows[i].username;
				reobj.userphoto=result1.rows[i].userphoto;
				retosend.push(reobj)
			}
			res.send(retosend)
		})
	})
})

router.get("/getitem/:cata/:timestamp",function(req,res){
	client.execute("select * from group_item where cataid=? and createtime<? order by createtime desc limit 20",[],function(err,result){
		if (err)
		{
			console.error(err)
			res.send("internal err")
			return
		}
		var retosend=[]
		for (var i=0;i<result1.rows.length;i++)
		{
			var reobj={};
			reobj.cataname=result1.rows[i].cataname;
			reobj.cataid=result1.rows[i].cataid;
			reobj.commentnum=result1.rows[i].commentnum;
			reobj.createtime=result1.rows[i].createtime;
			reobj.groupname=result1.rows[i].groupname;
			reobj.commentnum=result1.rows[i].commentnum;
			reobj.lastcomment=result1.rows[i].lastcomment;
			reobj.lastcommenttime=result1.rows[i].lastcommenttime;
			reobj.commentnum=result1.rows[i].commentnum;
			reobj.lastcommentuserid=result1.rows[i].lastcommentuserid;
			reobj.lastcommentusername=result1.rows[i].lastcommentusername;
			reobj.lastcommentuserphoto=result1.rows[i].lastcommentuserphoto;
			reobj.pics=result1.rows[i].pics;
			reobj.text=result1.rows[i].text;
			reobj.title=result1.rows[i].title;
			reobj.url=result1.rows[i].url;
			reobj.type=result1.rows[i].type;
			reobj.usertype=result1.rows[i].usertype;
			reobj.userid=result1.rows[i].userid;
			reobj.username=result1.rows[i].username;
			reobj.userphoto=result1.rows[i].userphoto;
			retosend.push(reobj)
		}
		res.send(retosend)
	})
})



exports.router=router;