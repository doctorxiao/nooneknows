var https=require('https');
var express = require('express');
var uuid=require('node-uuid');
var event=require('events');
var session = require('express-session')
var config=require("./config.js").config;
var cql = require('node-cassandra-cql');
var client = new cql.Client(config.cassandra);
var router=express.Router();

var loginevents=new event.EventEmitter();
var app = express();
app.use(session({secret: 'this is it sounds cool', resave:true, saveUninitialized :true }));

loginevents.on("weiboaccesstokengot",function(req,res,access_token,method){
	https.get("https://api.weibo.com/2/account/get_uid.json?access_token="+access_token,function(resa){
		resa.on("data",function(d){
			var a=eval("("+d.toString()+")");
			console.log(a)
			if (a.uid==undefined)
			{
				res.send("从weibo.com获取数据出错1");
				return ;
			}
			https.get("https://api.weibo.com/2/users/show.json?access_token="+access_token+"&uid="+a.uid,function(resb){
				resb.on("data",function(dd){
					var aa=eval("("+dd.toString()+")");
					if (aa.id==undefined)
					{
						res.send("从weibo.com获取数据出错4");
						return ;
					}
					if (method==1)
					{
						loginevents.emit("loginuidgot",req,res,aa.id.toString(),"weibo",aa.screen_name,"",aa.avatar_large,access_token)
					} else
					{
						loginevents.emit("binduidgot",req,res,aa.id.toString(),"weibo",aa.screen_name,"",aa.avatar_large,access_token)
					}
				})
				resb.on("error",function(dd){
					res.send("从weibo.com获取数据出错2");
				})
			})
		})
		resa.on("error",function(err){
			res.send("从weibo.com获取数据出错3");
		})
	})
})

loginevents.on("loginuidgot",function(req,res,uid,source,name,email,photo,access_token){
	client.execute("select * from source where uid=? and site=? ;",[uid,source],function(err,result){
		if (err){
			res.send("内部错误，请重试2");
			return ;
		}
		if (result.rows.length==0)
		{
			var uuidtmp=uuid.v4()
			client.execute("insert into users (userid,username,email,photo,createtime) values(?,?,?,?,?)",[uuidtmp,name,email,photo,Date.parse(new Date())],function(insert_user_err,insert_user_result){
				if (insert_user_err)
				{
					res.send("内部错误，请重试3");
					return ;
				}
				req.session.uuid=uuidtmp
				if (req.session.token==undefined)
				{
					req.session.token=[]
				}
				req.session.token[source]=access_token
				client.execute("insert into source (uid,site,userid,access_token) values (?,?,?,?)",[uid,source,uuidtmp,access_token],function(insert_source_err,insert_source_result){
					if (insert_source_err)
					{
						res.send("内部错误，请重试4");
						return ;
					}
					res.redirect('http://www.itsounds.cool/userpanel/index');
				})
			})
		} else
		{
			req.session.uuid=result.rows[0].userid;
			if (req.session.token==undefined)
			{
				req.session.token=[]
			}
			req.session.token[source]=access_token;
			res.redirect('http://www.itsounds.cool/userpanel/index');
		}
	})				
})

loginevents.on("binduidgot",function(req,res,uid,source,name,email,photo,access_token){
	client.execute("select * from source where uid=? and site=? ;",[uid,source],function(err,result){
		if (err){
			res.send("内部错误，请重试2");
			return ;
		}
		if (result.rows.length==0)
		{
			var uuidtmp="";
			try
			{
				uuidtmp=req.session.uuid;
			}
			catch (exception){
			
			}
			if (uuidtmp=="")
			{
				res.send("您还没有登录，不能绑定账号");
				return ;
			}
			client.execute("insert into source (uid,site,userid,access_token) values (?,?,?,?)",[uid,source,uuidtmp,access_token],function(insert_source_err,insert_source_result){
				if (insert_source_err)
				{
					res.send("内部错误，请重试4");
					return ;
				}
				if (req.session.token==undefined)
				{
					req.session.token=[]
				}
				req.session.token[source]=access_token
				res.redirect('http://www.itsounds.cool/userpanel/index');
			})
		} else
		{
			res.send("此外部账号已绑定过，请勿重复绑定");
		}
	})				
})

router.get("/checklogin",function(req,res){
	console.log(req.session.cookie)
	res.send(req.session.uuid)
})

router.get("/weibologin",function(req,res){
	if (req.query.code!=undefined)
	{
		var options={}
		options.host="api.weibo.com";
		options.method="POST";
		options.path="/oauth2/access_token?client_id=864293699&client_secret=65af619275454b6534a98a1ca9daef4e&grant_type=authorization_code&redirect_uri=http://www.itsounds.cool/loginback/renrenlogin&code="+req.query.code;
		options.headers={"Content-Length":0}
		var post_req=https.request(options,function(post_res){
			post_res.on("data",function(ab){
				var a=eval("("+ab+")")
				if (a.access_token!=undefined)
				{
				    loginevents.emit("weiboaccesstokengot",req,res,a.access_token,1);
				}
			})
		})
		post_req.end()
	} else
	{
		res.send("授权出错");
	}
})

router.get("/weibobind",function(req,res){
	if (req.query.code!=undefined)
	{
		var options={}
		options.host="api.weibo.com";
		options.method="POST";
		options.path="/oauth2/access_token?client_id=864293699&client_secret=65af619275454b6534a98a1ca9daef4e&grant_type=authorization_code&redirect_uri=http://www.itsounds.cool/loginback/renrenlogin&code="+req.query.code;
		options.headers={"Content-Length":0}
		var post_req=https.request(options,function(post_res){
			post_res.on("data",function(ab){
				var a=eval("("+ab+")")
				if (a.access_token!=undefined)
				{
				    loginevents.emit("weiboaccesstokengot",req,res,a.access_token,2);
				}
			})
		})
		post_req.end()
	} else
	{
		res.send("授权出错");
	}
})

router.get("/renrenlogin",function(req,res){
	if (req.query.code!=undefined)
	{
		var options={}
		options.host="graph.renren.com";
		options.method="POST";
		options.path="/oauth/token?grant_type=authorization_code&client_id=0d84eb06e9304cd6ad5d56bbc5a4c76e&redirect_uri=http://www.itsounds.cool/loginback/renrenlogin&client_secret=dca3ec7d0aa241b9894dd376df21e716&code="+req.query.code;
		options.headers={"Content-Length":0}
		var post_req=https.request(options,function(post_res){
			post_res.on("data",function(ab){
				var a=eval("("+ab+")")
				if (a.user==undefined || a.user.id==undefined)
				{
					res.send("验证错误2");
					return ;
				}
				if (a.access_token!=undefined)
				{
				    loginevents.emit("loginuidgot",req,res,a.user.id.toString(),"renren",a.user.name,"",a.user.avatar[1].url,a.access_token)
				}
			})
		})
		post_req.end()
	} else
	{
		res.send("授权出错");
	}
})

router.get("/renrenbind",function(req,res){
	if (req.query.code!=undefined)
	{
		var options={}
		options.host="graph.renren.com";
		options.method="POST";
		options.path="/oauth/token?grant_type=authorization_code&client_id=0d84eb06e9304cd6ad5d56bbc5a4c76e&redirect_uri=http://www.itsounds.cool/loginback/renrenbind&client_secret=dca3ec7d0aa241b9894dd376df21e716&code="+req.query.code;
		options.headers={"Content-Length":0}
		var post_req=https.request(options,function(post_res){
			post_res.on("data",function(ab){
				var a=eval("("+ab+")")
				if (a.user==undefined || a.user.id==undefined)
				{
					res.send("验证错误2");
					return ;
				}
				if (a.access_token!=undefined)
				{
				    loginevents.emit("binduidgot",req,res,a.user.id.toString(),"renren",a.user.name,"",a.user.avatar[1].url,a.access_token)
				}
			})
		})
		post_req.end()
	} else
	{
		res.send("授权出错");
	}
})

exports.back=router;
