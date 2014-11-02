var oss=require("aliyun-oss")
var crypto=require("crypto")
var config=require("./config.js").config
var ossoption = {
  accessKeyId: config.aliyunoss.accessKeyId,
  accessKeySecret: config.aliyunoss.accessKeysecret,
  host:config.aliyunoss.host
};
var ossclient = oss.createClient(ossoption);

var uploadBuffer=function(upload,callback)
{
	var md5=crypto.createHash('md5')
	md5.update(upload.buffer)
	var md5result=md5.digest('hex')
	var name=Date.parse(new Date())+"|"+md5result+"|"+upload.buffer.length+"."+upload.fileSuffix.toLowerCase()
	if (upload.is_Pic!=undefined && upload.is_Pic)
	{
		name="p"+name
	} else
	{
		name="a"+name
	}
	var option={}
	option.bucket="itsoundscool"
	option.object=name
	option.source=upload.buffer
	option.headers={}
	if (upload.contentType!=undefined)
	{
		option.headers={
			"Content-Type":upload.contentType
		}
	} 
	ossclient.putObject(option,callback);
}

exports.uploadBuffer=uploadBuffer

