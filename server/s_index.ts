import * as http from 'http'
import * as url from 'url'
import * as fs from 'fs'
import { myTools } from '../common/MyTools';
import { SEP, SERVER_PORT } from './../common/config'
import { DirInfoManager } from './../common/DirInfoManager'
import * as querystring from 'querystring'
import { DiffInfo } from '../common/Beans';
import { handleDiffUplaod, updateResDir } from './script/DiffUpload';

/**
 * 差异上传服务器 
 * 流程 :
 * c2s请求要上传资源服务器暂存版本的目录信息-->s_do查找要上传的zip返回相关dirInfo--> s2s_dirInfo(包含uuid校验轮次,md5) 
 * -->c_do对比dirinfo 于要上传文件目录差异 --> c_do得到要不同文件按原来目录结构进行存放打包zip
 * -->c2s上传服务器包含从服务器得到的uuid -->s_do服务器得到差异zip包,差异目录信息,校验uuid,解压zip对比于本地目录缺则补异则替多则删 
 * -->s_do 重新打包成新zip -->客户端要上传的源文件取md5,服务器最终处理完的文件再去md5 判断差异上传是否成功
 */


let _currHandleUUID: string
let _currHandleDiffInfo: DiffInfo
let s_resMap = {
    ['uploadDir']: `${__dirname}${SEP}uploadDir`, //上传文件暂存目录
    ['resDir']: `${__dirname}${SEP}res`, //资源文件目录
    ['outputDir']: `${__dirname}${SEP}outputDir`, //最终输出目录
}

let operationList = {
    ['requestDirInfo']: 'requestDirInfo', //c2s 资源目录信息
    ['uploadDiffZip']: 'uploadDiffZip', //上传
    ['putInDiffInfo']: 'putInDiffInfo',//客户端提交diffInfo信息 服务器确认uuid
}
let uploadRes = `${s_resMap.resDir}${SEP}GamingDragon`




function router(resquest: http.IncomingMessage, response: http.ServerResponse) {
    let urlInfo = resquest.url ? resquest.url : ''
    console.log('urlInfo:', urlInfo)
    let pathName = <string>url.parse(urlInfo).pathname
    console.log('pathName:', pathName)
    pathName = pathName.substr(1, pathName.length)
    console.log('pathName_1:', pathName)
    if (pathName == 'favicon.ico') {
        return
    }
    switch (pathName) {
        case operationList.requestDirInfo:
            onRequestDirInfo(resquest, response, (err) => {
                if (!err) {
                    console.log('onRequestDirInfo success')
                }
            })
            break;
        case operationList.uploadDiffZip:
            onUploadDiffZip(resquest, response, (err) => {
                if (!err) {
                    console.log('onUploadDiffZip success')
                }
            })
            break;
        case operationList.putInDiffInfo:
            onPutInDiffInfo(resquest, response, (err) => {
                if (!err) {
                    console.log('putInDiffInfo success')
                }
            })
            break;
        default:
            break
    }
}

function createServer() {
    console.log('server start...')
    http.createServer((resquest: http.IncomingMessage, response: http.ServerResponse) => {
        router(resquest, response)
    }).listen(SERVER_PORT)
}
/**
 * 处理客户端请求差异上传服务器保存目录的目录信息
 * @param request 
 * @param response 
 * @param cb 
 */
function onRequestDirInfo(request: http.IncomingMessage, response: http.ServerResponse, cb: (err: any) => void) {


    _currHandleUUID = myTools.uuid()
    //每当接收到请求体数据，累加到post中
    let body = ''
    request.on('data', function (chunk) {
        body += chunk;
    });
    request.on('end', function () {
        // 解析参数
        let body_1 = querystring.parse(body);  //将一个字符串反序列化为一个对象
        console.log("body:", body_1);
        let want = <string>body_1['wantUploadDir']
        let wantUploadDirName = <string>JSON.parse(want)['wantUploadDirName']
        console.log('客户端请求上传的目录名:', wantUploadDirName)
        uploadRes = `${s_resMap.resDir}${SEP}${wantUploadDirName}`
        let dirInfoManager = new DirInfoManager(uploadRes, _currHandleUUID)
        let dirInfo = dirInfoManager.getDirInfo()
        response.writeHead(200, { "Content-Type": "application/json" });
        let msg = { dirInfo: dirInfo, code: 200 }  //dirInfo 与客户端约定
        let msgJson = JSON.stringify(msg)
        response.write(msgJson)
        response.end()
    });
}
/**
 * 处理客户端上传差异zip文件 
 * @param request 
 * @param response 
 * @param cb 
 */
function onUploadDiffZip(request: http.IncomingMessage, response: http.ServerResponse, cb: (err: any) => void) {
    let mathod = request.method ? request.method : ''
    response.connection.setTimeout(0)

    if (mathod.toLowerCase() == "post") {
        let chunks: any[] = [];
        request.on("data", (chunk) => {
            chunks.push(chunk);
        })
        request.on("end", () => {
            let buf = Buffer.concat(chunks)
            let address = `${s_resMap.uploadDir}${SEP}${_currHandleDiffInfo.rootName}.zip`
            fs.writeFile(address, buf, function (err) {
                cb(err)
                if (!err) {
                    console.log('上传完成')
                    //比较上传zip的md5值 检测客户端上传差异zip 是否成功
                    new Promise(((resolve, reject) => {
                        myTools.getMd5(address, (md5) => {
                            //console.log('服务器接收到的差异文件:', address)
                            // console.log('服务器接收到的差异文件md5:', md5)
                            if (md5 == _currHandleDiffInfo.diffZip_md5) {
                                console.log('客户端上传差异zip成功')
                                return resolve()
                            } else {
                                console.error('客户端上传差异zip失败 s_diffZipMd5:', md5, 'c_diffZipMd5:', _currHandleDiffInfo.diffZip_md5)
                                return reject()
                            }
                        })
                    }))
                        //差异处理 增删文件
                        .then(() => {
                            return new Promise((resovle) => {
                                handleDiffUplaod(_currHandleDiffInfo, address, uploadRes, () => {

                                    console.log('差异文件处理完毕!')
                                    return resovle()
                                })
                            })
                        })
                        //返回客户端差异上传结果 (不再进行zip文件的md5校验)
                        .then(() => {
                            let code = 200
                            // if (s_zipSize != _currHandleDiffInfo.zipSize) {
                            //     code = 404
                            //     console.error('差异上传失败!')
                            // }
                            let msg = { code: code }

                            response.writeHead(code, { "Content-Type": "application/json" });
                            response.write(JSON.stringify(msg))
                            response.end()
                            console.log('差异上传处理完成! msg:', msg)

                            console.log('更新服务器res目录下操作的文件')
                            if (code == 200) {
                                updateResDir(_currHandleDiffInfo.rootName, () => {
                                    console.log('res 目录更新完成', ' 并没有删除output目录下的文件')
                                })
                            }
                        })
                }
            })
        })
    }
}



//处理客户端发来的diffInfo 判断轮次是否正确
function onPutInDiffInfo(request: http.IncomingMessage, response: http.ServerResponse, cb: (err: any) => void) {
    //每当接收到请求体数据，累加到post中
    let body = ''
    request.on('data', function (chunk) {
        body += chunk;
    });
    //{ diffInfo: diffInfo_objStr }
    request.on('end', function () {
        // 解析参数
        let body_1 = querystring.parse(body);  //将一个字符串反序列化为一个对象
        console.log("body:", body_1);
        let diffInfo_json = <string>body_1['diffInfo']
        let diffInfo = <DiffInfo>JSON.parse(diffInfo_json)
        console.log(diffInfo)
        if (diffInfo.uuid == _currHandleUUID) {
            _currHandleDiffInfo = diffInfo
            response.writeHead(200, { "Content-Type": "application/json" });
            response.write(JSON.stringify({ curr_uuid: _currHandleUUID, code: 200 }))
        } else {
            response.writeHead(404, { "Content-Type": "application/json" });
            response.write(JSON.stringify({ curr_uuid: _currHandleUUID, code: 404 }))
        }
        response.end();
    });
}


function onUpload(request: http.IncomingMessage, response: http.ServerResponse, cb: (err: any) => void) {
    console.log('upload')
    response.writeHead(200, { "Content-type": "text/html;charset=UTF-8", "Access-Control-Allow-Origin": "*" });
    let mathod = request.method ? request.method : ''
    if (mathod.toLowerCase() == "post") {
        //新建一个空数组接受流的信息
        let chunks: any[] = [];
        //获取长度
        let num = 0;

        request.on("data", function (chunk) {
            chunks.push(chunk);
            num += chunk.length;
        });
        request.on("end", function () {
            //最终流的内容本体
            var buffer = Buffer.concat(chunks, num);
            //新建数组接收出去\r\n的数据下标
            let rems = [];
            //根据\r\n分离数据和报头
            for (var i = 0; i < buffer.length; i++) {
                let v = buffer[i];
                let v2 = buffer[i + 1];
                // 10代表\n 13代表\r
                if (v == 13 && v2 == 10) {
                    rems.push(i)
                }
            }

            let uplordData = buffer.slice(rems[0] + 2, rems[1]).toString();
            console.log('uplordData:', uplordData);
            let tempStr = uplordData.split('filename="')[1]
            let filename = tempStr.substr(0, tempStr.length - 1)
            console.log("filename:", filename);
            let extensionName = filename.split('.')[1]
            // filename = myTools.uuid() + extensionName //使用uuid名称
            let nbuf = buffer.slice(rems[3] + 2, rems[rems.length - 2]);
            let address = s_resMap.uploadDir + filename;
            //创建空文件并写入内容
            fs.writeFile(address, nbuf, function (err) {
                cb(err)
                if (!err) {
                    console.log('上传成功', filename)
                }
            })

        })
    }
}


createServer()



function test() {
    console.log('----------------------- test ------------------------------')

    //压缩测试
    // let testRes = 'GamingDragon'
    // let resPath = `${resMap.resDir}${SPRIT}${testRes}`
    // let outPath = `${resMap.zipDir}${SPRIT}${testRes}.zip`
    // myTools.archiverZip(resPath, outPath, () => {
    //     console.log('archiveZip success!')
    // })

    //解压测试
    // let testRes = 'GamingDragon.zip'
    // let resPath = `${resMap.resDir}${SPRIT}${testRes}`
    // let outPath = `${resMap.unzipDir}`
    // myTools.unZip(resPath, outPath, () => {
    //     console.log('unzip success')
    // })

    //获取dirInfo 
    // console.log('testRes:', testRes)
    // let dirInfo = new DirInfoManager(testRes, '')
    // console.log('dirInfo:', dirInfo)


    // let resPath = `${s_resMap.zipDir}${SPRIT}GamingDragon.zip`
    // let outPath = `${s_resMap.zipDir}`
    // console.log('resPath:', resPath)
    // console.log('outPath:', outPath)
    // myTools.unZip(resPath, outPath, () => {
    //     console.log('解压成功')
    // })

    // let testPath_3 = `${s_resMap.outputDir}${SEP}GamingDragon.zip`


    // myTools.getMd5(testPath_1, (str) => {
    //     console.log(`${testPath_1}文件的md5值为:`, str)
    // })
    // let testPath_6 = `${s_resMap.outputDir}${SEP}GamingDragon`
    // let testPath_7 = `${s_resMap.outputDir}${SEP}GamingDragon.zip`
    // myTools.archiverZip(testPath_6, testPath_7, () => {
    //     myTools.getMd5(testPath_7, (str) => {
    //         console.log(`${testPath_7}文件的md5值为:`, str)
    //     })
    // })

    // myTools.unZip(`${s_resMap.uploadDir}${SEP}VXshare.zip`, `${s_resMap.uploadDir}`, () => {
    //     console.log('解压成功')
    // })
    myTools.unzip(`${s_resMap.outputDir}${SEP}myWxShare.zip`).then(() => { '解压成功' }, () => { '解压失败' })
}

//test()

export { s_resMap }