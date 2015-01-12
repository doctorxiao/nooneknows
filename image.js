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
var udpclient = dgram.createSocket("udp4");
app.set('views', __dirname + '/views');
app.engine('html', ejs.__express);
app.set('view engine','html');
app.use(bodyparser.urlencoded({ extended: false }))
app.use(bodyparser.json({limit:"20480kb"}))
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
		obj.id=""
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
				app.render("error",{msg:"这个图集不是您的，无权操作",page:"图集："+result.rows[0].name,pageurl:"http://www.itsounds.cool/collection/"+result.rows[0].id},function(err,html){
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
			app.render("error",{msg:"这个图集不是您的，无权操作",page:"图集："+result.rows[0].name,pageurl:"http://www.itsounds.cool/collection/"+result.rows[0].id},function(err,html){
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
				app.render("error",{msg:"这个图集不是空的，不能删除",page:"图集："+result.rows[0].name,pageurl:"http://www.itsounds.cool/collection/"+result.rows[0].id},function(err,html){
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
						app.render("error",{msg:"这个图集不是您的，无权操作",page:"图集："+result.rows[0].name,pageurl:"http://www.itsounds.cool/collection/"+result.rows[0].id},function(err,html){
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
								app.render("error",{msg:"操作成功，信息已修改",page:"图集"+result.rows[0].name,pageurl:"http://www.itsounds.cool/collection/"+result.rows[0].id},function(err,html){
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

router.get('/upload_images',function(req,res){
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
	client.execute("select * from pic_album where userid=?",[req.session.uuid],function(err,result){
		if (err)
		{
			app.render("error",{msg:"发生内部错误",page:"cool图首页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
		app.render("image_upload_choose",{albums:result.rows},function(err,html){
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

router.get('/upload_album/:id',function(req,res){
	var re =/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/;
	var result=re.test(req.param('id'));
	if (!result)
	{
		app.render("error",{msg:"参数不正确",page:"cool图",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		app.render("error",{msg:"您还没有登录，不能访问这里",page:"登录页",pageurl:"http://www.itsounds.cool/login"},function(err,html){
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
	client.execute("select * from pic_album where id=?",[req.param('id')],function(err,result){
		if (err)
		{
			app.render("error",{msg:"发生内部错误",page:"cool图首页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
		if (result.rows.length<1)
		{
			app.render("error",{msg:"参数错误，不存在这个图集",page:"cool图首页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
		if (result.rows[0].userid!=req.session.uuid)
		{
			app.render("error",{msg:"这个图集不是您的，无权操作",page:"图集："+result.rows[0].name,pageurl:"http://www.itsounds.cool/collection/"+result.rows[0].id},function(err,html){
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
		app.render("image_upload_album",{album:result.rows[0]},function(err,html){
				if (err)
				{
					console.error(err)
					res.send("发生了一些错误6")
					return
				}
				res.send(html)
		})
	})
})

router.get('/upload_album_text/:id',function(req,res){
	var re =/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/;
	var result=re.test(req.param('id'));
	if (!result)
	{
		app.render("error",{msg:"参数不正确",page:"cool图",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		app.render("error",{msg:"您还没有登录，不能访问这里",page:"登录页",pageurl:"http://www.itsounds.cool/login"},function(err,html){
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
	client.execute("select * from pic_album where id=?",[req.param('id')],function(err,result){
		if (err)
		{
			app.render("error",{msg:"发生内部错误",page:"cool图首页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
		if (result.rows.length<1)
		{
			app.render("error",{msg:"参数错误，不存在这个图集",page:"cool图首页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
		if (result.rows[0].userid!=req.session.uuid)
		{
			app.render("error",{msg:"这个图集不是您的，无权操作",page:"图集："+result.rows[0].name,pageurl:"http://www.itsounds.cool/collection/"+result.rows[0].id},function(err,html){
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
		app.render("image_upload_album_text",{album:result.rows[0]},function(err,html){
				if (err)
				{
					console.error(err)
					res.send("发生了一些错误6")
					return
				}
				res.send(html)
		})
	})
})


router.post('/upload_save/:id',function(req,res){
	var re =/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/;
	var result=re.test(req.param('id'));
	var output={}
	output.files=[]
	var title=""
	var desc=""
	if (!result)
	{
		res.send("参数错误"); //待改
		return 
	}
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		var oi={}
		oi.name="nofile.no"
		oi.error="login error"
		output.files.push(oi)
		res.send(output)
		return 
	}
	client.execute("select * from pic_album where id=?",[req.param('id')],function(err,result0){
		if (err)
		{
			var oi={}
			oi.name="nofile.no"
			oi.error="internal error0"
			output.files.push(oi)
			res.send(output)
			return
		}
		if (result0.rows.length<1)
		{
			var oi={}
			oi.name="nofile.no"
			oi.error="internal error01"
			output.files.push(oi)
			res.send(output)
			return
		}
		if (result0.rows[0].userid!=req.session.uuid)
		{
			var oi={}
			oi.name="nofile.no"
			oi.error="internal error02"
			output.files.push(oi)
			res.send(output)
			return
		}
		var form = new multiparty.Form({maxFilesSize:"20971520"});
		form.parse(req, function(err, fields, files) {
			try
			{
				fs.readFile((files.filesupload)[0].path, function (err, data) {
					if (err)
					{
						var oi={}
						oi.name=(files.filesupload)[0].originalFilename
						oi.error="internal error"
						output.files.push(oi)
						res.send(output)
						return 
					}
					var tupload={}
					tupload.buffer=data
					tupload.contentType=(files.filesupload)[0].headers["content-type"]
					tupload.fileSuffix=tupload.contentType.substring(tupload.contentType.indexOf("/")+1).toLowerCase()
					if (tupload.fileSuffix!="bmp" &&tupload.fileSuffix!="gif" &&tupload.fileSuffix!="jpg" &&tupload.fileSuffix!="jpeg" &&tupload.fileSuffix!="png")
					{
						var oi={}
						oi.name=(files.filesupload)[0].originalFilename
						oi.error="format error"
						output.files.push(oi)
						res.send(output)
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
							return
						}
						if (result.rows.length>0)
						{
							url=result.rows[0].url
						} else
						{
							upload.uploadBuffer(tupload,function(err,result1){
								if (err)
								{
									console.error(err)
									var oi={}
									oi.name=(files.filesupload)[0].originalFilename
									oi.error="internal error2"
									output.files.push(oi)
									res.send(output)
									return 
								}
								if (result1.status!=undefined && result1.status==200 && result1.objectUrl!=undefined)
								{
									url=result1.objectUrl
									client.execute("insert into pic (size,md5,url,uploadtime) values (?,?,?,?)",[data.length,md5result,result1.objectUrl,Date.parse(new Date())/1000],function(err,result2){
										if (err)
										{
											var oi={}
											oi.name=(files.filesupload)[0].originalFilename
											oi.error="internal error3"
											output.files.push(oi)
											res.send(output)
											return 
										}
										client.execute("insert into pic_album_item (album_id,createtime,title,description,md5,size,url,picid) values (?,?,?,?,?,?,?,?)",[req.param('id'),cql.types.Long.fromString(new Date().getTime().toString()),title,desc,md5result,data.length,url,uuid.v4()],function(err,result3){
											if (err)
											{
												console.error(err)
												var oi={}
												oi.name=(files.filesupload)[0].originalFilename
												oi.error="internal error4"
												output.files.push(oi)
												res.send(output)
												return 
											}
											var oi={}
											oi.name=(files.filesupload)[0].originalFilename
											oi.size=data.length
											oi.url=url
											output.files.push(oi)
											res.send(output)
										})
									})
								}
							})
						}
					})
				})
			}
			catch (err)
			{
				console.error(err)
			}
		})
	})
})

router.post('/upload_save_text/:id',bodyparser.urlencoded({ extended: false,limit:"20480kb" }),function(req,res){
	var re =/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/;
	var result=re.test(req.param('id'));
	var output={}
	output.files=[]
	var title=""
	var desc=""
	if (req.body.title!=undefined)
	{
		title=req.body.title
	}
	if (req.body.desc!=undefined)
	{
		desc=req.body.desc
	}
	if (!result)
	{
		res.send("参数错误"); //待改
		return 
	}
	if (req.body.b==undefined)
	{
		res.send("bad")
		return 
	}
	var posi=req.body.b.indexOf(",")
	var datax=req.body.b.substr(posi+1);
	var type=req.body.b.substring(5,posi-7)
	console.error(type)
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		var oi={}
		oi.name="nofile.no"
		oi.error="login error"
		output.files.push(oi)
		res.send(output)
		return 
	}
	client.execute("select * from pic_album where id=?",[req.param('id')],function(err,result0){
		if (err)
		{
			var oi={}
			oi.name="nofile.no"
			oi.error="internal error0"
			output.files.push(oi)
			res.send(output)
			return
		}
		if (result0.rows.length<1)
		{
			var oi={}
			oi.name="nofile.no"
			oi.error="internal error01"
			output.files.push(oi)
			res.send(output)
			return
		}
		if (result0.rows[0].userid!=req.session.uuid)
		{
			var oi={}
			oi.name="nofile.no"
			oi.error="internal error02"
			output.files.push(oi)
			res.send(output)
			return
		}
			try
			{
					var data = new Buffer(datax, 'base64')
					var tupload={}
					tupload.buffer=data
					tupload.contentType=type
					tupload.fileSuffix=tupload.contentType.substring(tupload.contentType.indexOf("/")+1).toLowerCase()
					if (tupload.fileSuffix!="bmp" &&tupload.fileSuffix!="gif" &&tupload.fileSuffix!="jpg" &&tupload.fileSuffix!="jpeg" &&tupload.fileSuffix!="png")
					{
						var oi={}
						oi.name="nofile.no"
						oi.error="format error"
						output.files.push(oi)
						res.send(output)
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
							console.error(err)
							var oi={}
							oi.name="nofile.no"
							oi.error="internal error4"
							output.files.push(oi)
							res.send(output)
							return 
						}
						if (result.rows.length>0)
						{
							url=result.rows[0].url
							client.execute("insert into pic_album_item (album_id,createtime,title,description,md5,size,url,picid) values (?,?,?,?,?,?,?,?)",[req.param('id'),cql.types.Long.fromString(new Date().getTime().toString()),title,desc,md5result,data.length,url,uuid.v4()],function(err,result3){
								if (err)
								{
									console.error(err)
									var oi={}
									oi.name="nofile.no"
									oi.error="internal error4"
									output.files.push(oi)
									res.send(output)
									return 
								}
								var oi={}
								oi.name="nofile.no"
								oi.size=data.length
								oi.url=url
								output.files.push(oi)
								res.send(output)
							})
						} else
						{
							upload.uploadBuffer(tupload,function(err,result1){
								if (err)
								{
									console.error(err)
									var oi={}
									oi.name="nofile.no"
									oi.error="internal error2"
									output.files.push(oi)
									res.send(output)
									return 
								}
								if (result1.status!=undefined && result1.status==200 && result1.objectUrl!=undefined)
								{
									url=result1.objectUrl
									client.execute("insert into pic (size,md5,url,uploadtime) values (?,?,?,?)",[data.length,md5result,result1.objectUrl,Date.parse(new Date())/1000],function(err,result2){
										if (err)
										{
											var oi={}
											oi.name="nofile.no"
											oi.error="internal error3"
											output.files.push(oi)
											res.send(output)
											return 
										}
										client.execute("insert into pic_album_item (album_id,createtime,title,description,md5,size,url,picid) values (?,?,?,?,?,?,?,?)",[req.param('id'),cql.types.Long.fromString(new Date().getTime().toString()),title,desc,md5result,data.length,url,uuid.v4()],function(err,result3){
											if (err)
											{
												console.error(err)
												var oi={}
												oi.name="nofile.no"
												oi.error="internal error4"
												output.files.push(oi)
												res.send(output)
												return 
											}
											var oi={}
											oi.name="nofile.no"
											oi.size=data.length
											oi.url=url
											output.files.push(oi)
											res.send(output)
										})
									})
								}
							})
						}
					})
				
			}
			catch (err)
			{
				console.error(err)
			}
	})
})

router.post('/upload_album_save/:id',function(req,res){
	var re =/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/;
	var result=re.test(req.param('id'));
	if (!result)
	{
		res.send("参数错误"); //待改
		return 
	}
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		res.send("未登录"); //待改
		return 
	}
	client.execute("select * from pic_album where id=?",[req.param('id')],function(err,result){
		if (err)
		{
			res.send("内部错误"); //待改
			return 
		}
		if (result.rows.length<1)
		{
			res.send("参数错误"); //待改
			return 
		}
		if (result.rows[0].userid!=req.session.uuid)
		{
			res.send("权限错误"); //待改
			return 
		}
	})
})

router.post("/caiji",bodyparser.urlencoded({ extended: false }),function(req,res){
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		app.render("error",{msg:"您还没有登录，请登录后重试",page:"登录页",pageurl:"http://www.itsounds.cool/login"},function(err,html){
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
	if (req.body.gotpics==undefined)
	{
		app.render("error",{msg:"参数错误请重试",page:"cool图首页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
	var obj=JSON.parse(req.body.gotpics)
	if (obj.imgs==undefined || obj.imgs.length==0)
	{
		app.render("error",{msg:"参数错误请重试",page:"cool图首页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
	client.execute("select * from pic_album where userid=?",[req.session.uuid],function(err,result){
		if (err)
		{
			app.render("error",{msg:"内部错误，请重试",page:"登录页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
				if (err)
				{
					console.error(err)
					res.send("内部错误，请重试")
					return
				}
				res.send(html)
			})
			return
		}
		if (result.rows.length<1)
		{
			app.render("error",{msg:"您没有图集，请先新建一个",page:"新建图集",pageurl:"http://www.itsounds.cool/image/newalbum"},function(err,html){
				if (err)
				{
					console.error(err)
					res.send("内部错误2，请重试")
					return
				}
				res.send(html)
			})
			return
		}
		var other={}
		other.referer=obj.referer;
		if (obj.cookie!=undefined) {
			other.cookie=obj.cookie;
		}
		app.render("image_caiji",{pics:obj.imgs,albums:result.rows,other:JSON.stringify(other)},function(err,html){
			if (err)
			{
				console.error(err)
				res.send("内部错误3，请重试")
				return
			}
			res.send(html)
		})
	})
})

router.post("/caijigot",bodyparser.urlencoded({ extended: false }),function(req,res){
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		app.render("error",{msg:"您还没有登录，请登录后重试",page:"登录页",pageurl:"http://www.itsounds.cool/login"},function(err,html){
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
	if (req.body.pics==undefined)
	{
		app.render("error",{msg:"参数错误请重试1",page:"cool图首页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
	var obj=JSON.parse(req.body.pics)
	if (obj.pics==undefined || obj.pics.length==0)
	{
		app.render("error",{msg:"参数错误请重试2",page:"cool图首页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
	if (obj.albumid==undefined)
	{
		app.render("error",{msg:"参数错误请重试3",page:"cool图首页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
	var albumid=obj.albumid;
	client.execute("select * from pic_album where id=?",[albumid],function(err,result0){
		if (err)
		{
			console.error(err)
			return 
		}
		if (result0.rows.length<1 || result0.rows[0].userid!=req.session.uuid)
		{
			app.render("error",{msg:"权限错误",page:"cool图首页",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
		if (obj.other!=undefined) {
			var other=JSON.parse(obj.other);
		}
		var hdarr=obj.pics.slice(0,100)
		var total=0;
		while (total*20<hdarr.length)
		{
			var nowhd={}
			nowhd.album=albumid
			if (obj.other!=undefined) {
				nowhd.other=JSON.parse(obj.other);
			}
			nowhd.url=hdarr.slice(total*20,total*20+20)
			total=total+1
			var sstre=JSON.stringify(nowhd);
			var sbuf=new Buffer(sstre)
			udpclient.send(sbuf, 0, sbuf.length, 2000, "127.0.0.1", function(err, bytes) {
			});
		}
		
		app.render("error",{msg:"操作成功",page:"浏览图集",pageurl:"http://www.itsounds.cool/image/collection/"+albumid},function(err,html){
			if (err)
			{
				console.error(err)
				res.send("发生了一些错误6")
				return
			}
			res.send(html)
		})
	})
})

router.get("/collection/:id",function(req,res){
	var re =/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/;
	var result=re.test(req.param('id'));
	if (!result)
	{
		app.render("error",{msg:"参数不正确",page:"cool图",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
	client.execute("select * from pic_album where id=?",[req.param('id')],function(err,result){
		if (err)
		{
			app.render("error",{msg:"参数不正确",page:"cool图",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
			app.render("error",{msg:"参数不正确",page:"cool图",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
		client.execute("select * from pic_album_item where album_id=? order by createtime desc limit 50;",[req.param('id')],function(err,result1){
			if (err)
			{
				console.error(err)
				app.render("error",{msg:"内部错误",page:"cool图",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
			var min=0;
			for(var i=0;i<result1.rows.length;i++)
			{
				if (i==0)
				{
					min=result1.rows[i].createtime
				}
				if (min>result1.rows[i].createtime)
				{
					min=result1.rows[i].createtime
				}
			}
			app.render("image_collection",{album:result.rows[0],pics:result1.rows,min:min},function(err,html){
				if (err)
				{
					console.error(err)
					res.send("发生了一些错误1")
					return
				}
				res.send(html)
			})
		})
	})
})

router.get("/collectionajax/:id/:timestamp",function(req,res){
	var re =/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/;
	var result=re.test(req.param('id'));
	var output={}
	try {
		var timestamp=cql.types.Long.fromString(req.param('timestamp'))
	}
	catch (e)
	{
		console.error(e)
		output.fail="true"
		res.send(output)
		return 
	}
	if (!result)
	{
		output.fail="true"
		res.send(output)
		return 
	}
	client.execute("select * from pic_album_item where album_id=? and createtime<? order by createtime desc limit 50;",[req.param('id'),timestamp],function(err,result){
		if (err)
		{
			console.error(err)
			output.fail="true"
			res.send(output)
			return 
		}
		output.fail="false"
		output.data=[]
		for(var i=0;i<result.rows.length;i++)
		{
			var item={}
			item.createtime=result.rows[i].createtime.toNumber();
			item.picid=result.rows[i].picid;
			item.description=result.rows[i].description;
			item.url=result.rows[i].url;
			item.title=result.rows[i].title;
			output.data.push(item)
		}
		res.send(output)
	})
})

router.get("/pic/:id",function(req,res){
	var re =/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/;
	var result=re.test(req.param('id'));
	if (!result)
	{
		app.render("error",{msg:"参数不正确",page:"cool图",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
	client.execute("select * from pic_album_item where picid=?",[req.param('id')],function(err,result){
		if (err)
		{
			console.error(err)
			app.render("error",{msg:"内部错误1",page:"cool图",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
			app.render("error",{msg:"参数错误",page:"cool图",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
		client.execute("select * from pic_album where id=?",[result.rows[0].album_id],function(err,result1){
			if (err)
			{
				console.error(err)
				app.render("error",{msg:"内部错误2",page:"cool图",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
			client.execute("select * from pic_album_item where album_id=? and createtime<? order by createtime desc limit 5",[result.rows[0].album_id,result.rows[0].createtime],function(err,result2){
				if (err)
				{
					console.error(err)
					app.render("error",{msg:"内部错误3",page:"cool图",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
				client.execute("select * from pic_album_item where album_id=? and createtime>? order by createtime asc limit 5",[result.rows[0].album_id,result.rows[0].createtime],function(err,result3){
					if (err)
					{
						console.error(err)
						app.render("error",{msg:"内部错误4",page:"cool图",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
					app.render("image_picitem",{pic:result.rows[0],album:result1.rows[0],pichou:result2.rows,picqian:result3.rows},function(err,html){
						if (err)
						{
							console.error(err)
							res.send("发生了一些错误7")
							return
						}
						res.send(html)
					})
				})
			})
		})
	})
})

router.get("/delpic/:picid",function(req,res){
	var re =/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/;
	var result=re.test(req.param('picid'));
	if (!result)
	{
		res.send("bad")
		return 
	}
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		res.send("bad")
		return 
	}
	client.execute("select * from pic_album_item where picid=?",[req.param('picid')],function(err,result){
		if (err)
		{
			console.error(err)
			res.send("bad")
			return 
		}
		if (result.rows.length<1)
		{
			res.send("bad")
			return 
		}
		client.execute("select * from pic_album where id=?",[result.rows[0].album_id],function(err,result1){
			if (err)
			{
				console.error(err)
				res.send("bad")
				return 
			}
			if (result1.rows.length<1)
			{
				res.send("bad")
				return 
			}
			if (result1.rows[0].userid!=req.session.uuid)
			{
				res.send("bad")
				return 
			}
			client.execute("delete from pic_album_item where album_id=? and createtime=? and md5=?",[result.rows[0].album_id,result.rows[0].createtime,result.rows[0].md5],function(err,result2){
				if (err)
				{
					console.error(err)
					res.send("bad")
					return 
				}
				res.send("ok")
			})
		})
	})
})

router.post("/editpic/:picid",bodyparser.urlencoded({ extended: false }),function(req,res){
	var re =/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/;
	var result=re.test(req.param('picid'));
	if (!result)
	{
		res.send("bad")
		return 
	}
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		res.send("bad")
		return 
	}
	var title="";
	var desc="";
	try{
		title=req.body.title
		desc=req.body.desc
	}
	catch (e)
	{
		console.error(e)
	}
	client.execute("select * from pic_album_item where picid=?",[req.param('picid')],function(err,result){
		if (err)
		{
			console.error(err)
			res.send("bad")
			return 
		}
		if (result.rows.length<1)
		{
			res.send("bad")
			return 
		}
		client.execute("select * from pic_album where id=?",[result.rows[0].album_id],function(err,result1){
			if (err)
			{
				console.error(err)
				res.send("internal err1")
				return 
			}
			if (result1.rows.length<1)
			{
				res.send("param err1")
				return 
			}
			if (result1.rows[0].userid!=req.session.uuid)
			{
				res.send("not owner")
				return 
			}
			client.execute("update pic_album_item set title=?,description=? where album_id=? and createtime=? and md5=?",[title,desc,result.rows[0].album_id,result.rows[0].createtime,result.rows[0].md5],function(err,result2){
				if (err)
				{
					console.error(err)
					res.send("internal err2")
					return 
				}
				res.send("ok")
			})
		})
	})
})

router.get("/fengmian/:picid",function(req,res){
	var re =/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/;
	var result=re.test(req.param('picid'));
	if (!result)
	{
		res.send("bad")
		return 
	}
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		res.send("bad")
		return 
	}
	var title="";
	var desc="";
	try{
		title=req.body.title
		desc=req.body.desc
	}
	catch (e)
	{
		console.error(e)
	}
	client.execute("select * from pic_album_item where picid=?",[req.param('picid')],function(err,result){
		if (err)
		{
			console.error(err)
			res.send("bad")
			return 
		}
		if (result.rows.length<1)
		{
			res.send("bad")
			return 
		}
		client.execute("select * from pic_album where id=?",[result.rows[0].album_id],function(err,result1){
			if (err)
			{
				console.error(err)
				res.send("bad")
				return 
			}
			if (result1.rows.length<1)
			{
				res.send("bad")
				return 
			}
			if (result1.rows[0].userid!=req.session.uuid)
			{
				res.send("bad")
				return 
			}
			client.execute("update pic_album set front+=? where id=?",[result.rows[0].url,result.rows[0].album_id],function(err,result2){
				if (err)
				{
					console.error(err)
					res.send("bad")
					return 
				}
				res.send("ok")
			})
		})
	})
})

router.get("/gettalk/:picid/:timestamp",function(req,res){
	client.execute("select * from pic_talk where picid=? and talktime<? order by talktime desc limit 10;",[req.param("picid"),cql.types.Long.fromString(req.param("timestamp"))],function(err,result){
		if (err)
		{
			console.error(err)
			res.send("error")
			return 
		} else
		{
			var re=[];
			for(var i=0;i<result.rows.length;i++)
			{
				var rei={}
				rei.nr=result.rows[i].nr;
				rei.userid=result.rows[i].userid;
				rei.username=result.rows[i].username;
				rei.userphoto=result.rows[i].userphoto;
				rei.talktime=result.rows[i].talktime.toString();
				re.push(rei)
			}
			res.send(re);
		}
	})
})

router.post("/talksave/:picid",bodyparser.urlencoded({ extended: false }),function(req,res){
	var re =/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/;
	var result=re.test(req.param('picid'));
	if (!result)
	{
		app.render("error",{msg:"参数不正确",page:"cool图",pageurl:"http://www.itsounds.cool/image"},function(err,html){
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
	if (req.session.uuid==undefined || req.session.uuid=="0" || req.session.uuid=="")
	{
		app.render("error",{msg:"您没有登录，不能评论",page:"登录页",pageurl:"http://www.itsounds.cool/login"},function(err,html){
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
	if (req.body.talknr==undefined || req.body.talknr.length==0)
	{
		app.render("error",{msg:"评论内容不能为空",page:"cool图",pageurl:"http://www.itsounds.cool/image/pic/"+req.param('picid')},function(err,html){
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
	client.execute("select * from users where userid=?",[req.session.uuid],function(err,result){
		if (err)
		{
			app.render("error",{msg:"内部错误1",page:"cool图",pageurl:"http://www.itsounds.cool/image/pic/"+req.param('picid')},function(err,html){
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
		if (result.rows.length<1)
		{
			app.render("error",{msg:"您还没有登录，不能评论",page:"登录页",pageurl:"http://www.itsounds.cool/login"},function(err,html){
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
		var dt=new Date();
		var milisec=dt.getMilliseconds().toString();
		if (milisec.length==2)
		{
			milisec="0"+milisec;
		}
		client.execute("insert into pic_talk (nr,picid,talktime,userid,username,userphoto) values (?,?,?,?,?,?)",[req.body.talknr,req.param('picid'),cql.types.Long.fromString((Date.parse(dt)/1000).toString()+milisec),req.session.uuid,result.rows[0].username,result.rows[0].photo],function(err,result1){
			if (err)
			{
				console.error(err);
				app.render("error",{msg:"内部错误2",page:"cool图",pageurl:"http://www.itsounds.cool/image/pic/"+req.param('picid')},function(err,html){
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
			res.redirect("/image/pic/"+req.param('picid'))
		})
	})
})


exports.router=router;