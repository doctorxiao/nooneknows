var Bagpipe=require("bagpipe");
var config=require("./config.js").config;
var cql = require('node-cassandra-cql');
var upload=require("./upload.js");
var client = new cql.Client(config.cassandra);
var http=require("http")
var dgram=require('dgram')
var event=require("events")
var url=require("url")
var sizeOf = require('image-size');
var crypto=require("crypto")
var uuid=require('node-uuid');
var emmiter=new event.EventEmitter();
var server = dgram.createSocket("udp4");
server.bind(2000)
var bagpipe = new Bagpipe(50);
bagpipe.on('full', function (length) {
  console.error('下载不能及时完成，排队中，目前队列长度为:' + length);
});

server.on("message", function (msg, rinfo) {
	try
	{
		var obj=JSON.parse(msg.toString())
		console.log(obj)
		if (obj.album!=undefined && obj.url!=undefined)
		{
			for(var i=0;i<obj.url.length;i++)
			{
				var item={}
				item.album=obj.album;
				if (obj.other!=undefined)
				{
					item.other=obj.other;
				}
				item.url=obj.url[i]
				emmiter.emit("start",item)
			}
		}
	}
	catch (e)
	{
		console.error(e)
	}
});

emmiter.on("start",function(urlobj){
	bagpipe.push(downloadpic,urlobj,function(buf,album){
		emmiter.emit("checksize",buf,album)
	})
})

emmiter.on("checksize",function(buf,album){
	try{
		var size=sizeOf(buf)
		if (size.type.toLowerCase()=="jpeg"||size.type.toLowerCase()=="jpg"||size.type.toLowerCase()=="bmp"||size.type.toLowerCase()=="png"||size.type.toLowerCase()=="gif")
		{
			if (size.width>100||size.height>100)
			{
				emmiter.emit("upload",buf,size,album)
			}
		}
	}
	catch (e)
	{
		console.error(e)
	}
})

emmiter.on("upload",function(buf,size,album){
	var md5=crypto.createHash('md5')
	md5.update(buf)
	var md5result=md5.digest('hex')
	var url="";
	client.execute("select * from pic where size=? and md5=?",[buf.length,md5result],function(err,result){
		if (err)
		{
			console.error(err)
			return
		}
		if (result.rows.length<1)
		{
			var tupload={}
			tupload.buffer=buf
			tupload.contentType="image/"+size.type
			tupload.fileSuffix=size.type
			tupload.is_Pic=true
			upload.uploadBuffer(tupload,function(err,result1){
				if (err)
				{
					console.error(err)
					return 
				}
				if (result1.status!=undefined && result1.status==200 && result1.objectUrl!=undefined)
				{
					client.execute("insert into pic (size,md5,url,uploadtime) values (?,?,?,?)",[buf.length,md5result,result1.objectUrl,Date.parse(new Date())/1000],function(err,result2){
						if (err)
						{
							return 
						}
						client.execute("insert into pic_album_item (album_id,createtime,title,description,md5,size,url,picid) values (?,?,?,?,?,?,?,?)",[album,cql.types.Long.fromString(new Date().getTime().toString()),"","",md5result,buf.length,result1.objectUrl,uuid.v4()],function(err,result3){})
					})
				} else
				{
					console.error(result1)
				}
			})
		} else
		{
			url=result.rows[0].url;
			client.execute("insert into pic_album_item (album_id,createtime,title,description,md5,size,url,picid) values (?,?,?,?,?,?,?,?)",[album,cql.types.Long.fromString(new Date().getTime().toString()),"","",md5result,buf.length,url,uuid.v4()],function(err,result3){
			})
		}
	})
})

emmiter.on("error",function(e){
	console.error(e)
})

function downloadpic(obj,callback){
	try
	{
		var urlobj=url.parse(obj.url)
		if (obj.other!=undefined)
		{
			urlobj.headers=obj.other;
		}
		http.get(urlobj,function(sres){
			if(sres.statusCode==200)
			{
				var buffers=[]
				var buflength=0;
				var toolarge=false;
				sres.on('data', function (chunk) {
					buffers.push(chunk)
					if (buflength>1024*1024*20)
					{
						toolarge=true;
						sres.end();
						return 
					}
					buflength+=chunk.length
				});
				sres.on("end",function(){
					if (!toolarge)
					{
						callback(Buffer.concat(buffers),obj.album)
					}
				})
			} else
			{
				console.error("geting error");
			}
		}).on('error', function(e) {
			console.error("Got error: " + e.message);
		});
	}
	catch (e)
	{
		console.error(e)
	}
}