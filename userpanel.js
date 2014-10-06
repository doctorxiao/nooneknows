var express = require('express');
var uuid=require('node-uuid');
var session = require('express-session')
var cql = require('node-cassandra-cql');
var client = new cql.Client({hosts: ['108.61.218.214', '108.61.218.220'], keyspace: 'site',username:'xx',password:"***********"});
var router=express.Router();


router.get("/index",function(req,res){
	if (session.uuid==undefined || session.uuid=="")
	{
		res.send("您还木有登录，请去<a href=\"http://www.itsounds.cool/login\">登录</a>")
		return ;
	}
	client.execute("select * from source where userid=? ;",[session.uuid],function(err,result){
		if (err){
			res.send("发生了一些错误，请重试");
			return ;
		}
		var str="<p>登录成功！您已绑定账号：</p>"
		for(var i=0;i<result.rows.length;i++)
		{
			str+="<p>"+result.rows[i].uid+"   @"+result.rows[i].site+"</p>"
		}
		str+="<p>下面您可以继续绑定其他账号<p>"
		str+="<p><a href=\"http://www.itsounds.cool/bind\">点击这里绑定其他帐号</a></p>"
		res.send(str)
	})
})

exports.router=router
