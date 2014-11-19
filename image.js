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
app.use(session({secret: 'this is it sounds cool', resave:true, saveUninitialized :true }));

router.get("/newalbum",function(req,res){
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		app.render("error",{msg:"您还没有登录，不能访问这里",page:"登录页",pageurl:"http://www.itsounds.cool/login"},function(err,html){
			if (err)
			{
				console.error(err)
				res.send("发生了一些错误")
				return
			}
			res.send(html)
		})
	} else {
		var obj={}
		obj.name=""
		obj.description=""
		obj.description="0"
		app.render("image_newablum",{album:obj},function(err,html){
			if (err)
			{
				console.error(err)
				res.send("发生了一些错误")
				return
			}
			res.send(html)
		})
	}
})


router.get("/modifyalbum/:id",function(req,res){
	var re =/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/;
	var result=re.test(req.param('id'));
	if (!result)
	{
		app.render("error",{msg:"参数不正确",page:"cool图",pageurl:"http://www.itsounds.cool/image"},function(err,html){
			if (err)
			{
				console.error(err)
				res.send("发生了一些错误")
				return
			}
			res.send(html)
		})
		return 
	}
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		app.render("error",{msg:"您还没有登录，不能访问这里",page:"登录页",pageurl:"http://www.itsounds.cool/login"},function(err,html){
			if (err)
			{
				console.error(err)
				res.send("发生了一些错误")
				return
			}
			res.send(html)
		})
	} else {
		var obj={}
		client.execute("select * from pic_album where id=?",[req.param('id')],function(err,result){
			if (err)
			{
				app.render("error",{msg:"发生了一些错误",page:"cool图首页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
					if (err)
					{
						console.error(err)
						res.send("发生了一些错误")
						return
					}
					res.send(html)
				})
				return 
			}
			if (result.rows.length<1)
			{
				app.render("error",{msg:"参数错误，不存在这个图集",page:"cool图首页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
					if (err)
					{
						console.error(err)
						res.send("发生了一些错误")
						return
					}
					res.send(html)
				})
				return 
			}
			if (result.rows[0].userid!=req.session.uuid)
			{
				app.render("error",{msg:"这个图集不是您的，无权操作",page:"图集："+result.rows[0].name,pageurl:"http://www.itsounds.cool/imagecollection/"+result.rows[0].id},function(err,html){
					if (err)
					{
						console.error(err)
						res.send("发生了一些错误")
						return
					}
					res.send(html)
				})
				return 
			}
			obj=result.rows[0]
			app.render("image_newablum",{album:obj},function(err,html){
				if (err)
				{
					console.error(err)
					res.send("发生了一些错误")
					return
				}
				res.send(html)
			})
		})
	}
})


router.get("/delalbum/:id",function(req,res){
	var re =/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/;
	var result=re.test(req.param('id'));
	if (!result)
	{
		app.render("error",{msg:"参数不正确",page:"cool图",pageurl:"http://www.itsounds.cool/image"},function(err,html){
			if (err)
			{
				console.error(err)
				res.send("发生了一些错误")
				return
			}
			res.send(html)
		})
		return 
	}
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		app.render("error",{msg:"您还没有登录，不能访问这里",page:"登录页",pageurl:"http://www.itsounds.cool/login"},function(err,html){
			if (err)
			{
				console.error(err)
				res.send("发生了一些错误")
				return
			}
			res.send(html)
		})
		return 
	} 
	client.execute("select * from pic_album where id=?",[req.param('id')],function(err,result){
		if (err)
		{
			app.render("error",{msg:"发生了一些错误,请重试",page:"上一页",pageurl:"javascript:history.go(-1)"},function(err,html){
				if (err)
				{
					console.error(err)
					res.send("发生了一些错误")
					return
				}
				res.send(html)
			})
			return 
		}
		if (result.rows.length<1)
		{
			app.render("error",{msg:"参数错误，不存在这个图集",page:"cool图首页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
				if (err)
				{
					console.error(err)
					res.send("发生了一些错误")
					return
				}
				res.send(html)
			})
			return 
		}
		if (result.rows[0].userid!=req.session.uuid)
		{
			app.render("error",{msg:"这个图集不是您的，无权操作",page:"图集："+result.rows[0].name,pageurl:"http://www.itsounds.cool/imagecollection/"+result.rows[0].id},function(err,html){
				if (err)
				{
					console.error(err)
					res.send("发生了一些错误")
					return
				}
				res.send(html)
			})
			return 
		}
		client.execute("select * from pic_album_item where album_id=? limit 1 allow filtering;",[result.rows[0].id],function(err,result1){
			if (err)
			{
				app.render("error",{msg:"发生了一些错误,请重试",page:"上一页",pageurl:"javascript:history.go(-1)"},function(err,html){
					if (err)
					{
						console.error(err)
						res.send("发生了一些错误")
						return
					}
					res.send(html)
				})
				return 
			}
			if (result1.rows.length>0)
			{
				app.render("error",{msg:"这个图集不是空的，不能删除",page:"图集："+result.rows[0].name,pageurl:"http://www.itsounds.cool/imagecollection/"+result.rows[0].id},function(err,html){
					if (err)
					{
						console.error(err)
						res.send("发生了一些错误")
						return
					}
					res.send(html)
				})
				return 
			}
			client.execute("delete from pic_album where id=?",[req.param('id')],function(err,result2){
				if (err)
				{
					app.render("error",{msg:"发生了一些错误,请重试",page:"上一页",pageurl:"javascript:history.go(-1)"},function(err,html){
						if (err)
						{
							console.error(err)
							res.send("发生了一些错误")
							return
						}
						res.send(html)
					})
					return 
				}
				app.render("error",{msg:"操作成功：图集已删除",page:"cool图首页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
					if (err)
					{
						console.error(err)
						res.send("发生了一些错误")
						return
					}
					res.send(html)
				})
			})
		})
	})
})

router.post("/newalbum_save",bodyparser.urlencoded({ extended: false }),function(req,res){
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		app.render("error",{msg:"您还没有登录，不能访问这里",page:"登录页",pageurl:"http://www.itsounds.cool/login"},function(err,html){
			if (err)
			{
				console.error(err)
				res.send("发生了一些错误")
				return
			}
			res.send(html)
		})
	} else {
		console.error(req.body)
		var desc="";
		if (req.body.albumname==undefined || req.body.albumname.length==0 || req.body.albumname=="")
		{
			app.render("error",{msg:"信息不完整，请重新填写",page:"上一页",pageurl:"javascript:history.go(-1)"},function(err,html){
				if (err)
				{
					console.error(err)
					res.send("发生了一些错误")
					return
				}
				res.send(html)
			})
			return 
		}
		if (req.body.albumdescription!=undefined && req.body.albumdescription!=0 && req.body.albumdescription!="")
		{
			desc=req.body.albumdescription
		}
		if (req.body.albumid!=undefined && req.body.albumid!="0" && req.body.albumid!="" )
		{
			client.execute("select * from pic_album where id=?",[req.body.albumid],function(err,result){
				if (result.rows.length<1)
				{
					app.render("error",{msg:"参数错误，不存在这个图集",page:"cool图首页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
						if (err)
						{
							console.error(err)
							res.send("发生了一些错误")
							return
						}
						res.send(html)
					})
				} else
				{
					if (result.rows[0].userid!=req.session.uuid)
					{
						app.render("error",{msg:"这个图集不是您的，无权操作",page:"图集："+result.rows[0].name,pageurl:"http://www.itsounds.cool/imagecollection/"+result.rows[0].id},function(err,html){
							if (err)
							{
								console.error(err)
								res.send("发生了一些错误")
								return
							}
							res.send(html)
						})
					} else
					{
						client.execute("update pic_album set name=?,description=? where id=?",[req.body.albumname,desc,result.rows[0].id],function(err,result1){
							if (err)
							{
								app.render("error",{msg:"发生内部错误，请重试",page:"上一页",pageurl:"javascript:history.go(-1)"},function(err,html){
									if (err)
									{
										console.error(err)
										res.send("发生了一些错误")
										return
									}
									res.send(html)
								})
							}  else {
								app.render("error",{msg:"操作成功，信息已修改",page:"图集"+result.rows[0].name,pageurl:"http://www.itsounds.cool/imagecollection/"+result.rows[0].id},function(err,html){
									if (err)
									{
										console.error(err)
										res.send("发生了一些错误")
										return
									}
									res.send(html)
								})
							}
						})
					}
				}
			})
		} else {
			var newuuid=uuid.v4()
			client.execute("insert into pic_album (id,name,description,userid,createtime) Values (?,?,?,?,?)",[newuuid,req.body.albumname,desc,req.session.uuid,Date.parse(new Date())/1000],function(err,result2){
				if (err)
				{
					console.error(err)
					app.render("error",{msg:"发生内部错误，请重试",page:"上一页",pageurl:"javascript:history.go(-1)"},function(err,html){
						if (err)
						{
							console.error(err)
							res.send("发生了一些错误")
							return
						}
						res.send(html)
					})
				} else
				{
					app.render("error",{msg:"新建图集成功！现在去上传图片",page:"向"+req.body.albumname+"上传图片",pageurl:"http://www.itsounds.cool/imageupload/"+newuuid},function(err,html){
						if (err)
						{
							console.error(err)
							res.send("发生了一些错误")
							return
						}
						res.send(html)
					})
				}
			})
		}
	}
})

exports.router=router;