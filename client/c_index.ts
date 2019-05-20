/**
 * 差异上传客户端
 */

import * as  http from 'http'
import { SEP, SERVER_IP, SERVER_PORT } from '../common/config';
import { handleWantUploadZip } from './script/c_HandleDirInfo';
import { DirInfo, DiffInfo } from '../common/Beans';
import { HandleZipByDiffInfo__test, updateZipByDiffInfo } from './script/c_DiffUploadHelper';
import { myTools } from '../common/MyTools';
import * as querystring from 'querystring'
import * as fs from 'fs-extra';


let c_resMap = {
    ['resDir']: `${__dirname}${SEP}res`,
    ['diffZipDir']: `${__dirname}${SEP}diffzip`,
}

let wantUploadZipPath = `${c_resMap.resDir}${SEP}GamingDragon.zip`
let wantUploadZip = 'myWxShare'


//let s_dirInfo: DirInfo
function c2s_getDirInfo() {
    //请求资源目录信息
    let josnStr = JSON.stringify({ wantUploadDirName: wantUploadZip })
    let wantUploadDir_data = querystring.stringify({ wantUploadDir: josnStr })
    let c2s_getDirInfo_options = {
        hostname: SERVER_IP,
        port: SERVER_PORT,
        path: '/requestDirInfo',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': wantUploadDir_data.length
        }
    }

    return new Promise(resolve => {
        console.log('c2s_getDirInfo....')
        // { dirInfo: dirInfo, code: 200 } 
        let request = http.request(c2s_getDirInfo_options, (res: http.IncomingMessage) => {
            //console.log('状态码:', res.statusCode)
            // console.log('头部:', res.headers)
            res.setEncoding('utf8')
            let data = ''
            res.on('data', (chunk) => {
                data += chunk
            })
            res.on('end', () => {
                //console.log('data:', data, 'type:', typeof (data))
                let obj = JSON.parse(data.trim())
                let s_dirInfo = obj['dirInfo']
                console.log('data:', s_dirInfo, 'type:', typeof (s_dirInfo), s_dirInfo.rootName)
                // console.log('s_dirInfo:', s_dirInfo)
                return resolve(s_dirInfo)
            })
        })
        request.write(wantUploadDir_data)
        request.end()
    })
}

//向服务器提交diffInfo 
function c2s_putDiffInfo(diffInfo: DiffInfo) {

    return new Promise((resolve, reject) => {
        let diffInfo_objStr = JSON.stringify(diffInfo)
        //console.log('diffInfo_objStr', diffInfo_objStr)
        let diffInfo_data = querystring.stringify({ diffInfo: diffInfo_objStr })
        // console.log('diffInfo_data', diffInfo_data)
        let c2s_putDiffInfo_options = {
            hostname: SERVER_IP,
            port: SERVER_PORT,
            path: '/putInDiffInfo',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': diffInfo_data.length
            }

        }
        console.log('c2s_putInDiffInfo....')
        //服务器返回信息格式 {curr_uuid:string ,code:number}
        let request = http.request(c2s_putDiffInfo_options, (res: http.IncomingMessage) => {
            res.setEncoding('utf8')
            res.on('data', (chunk: string) => {
                //console.log('data:', chunk, 'type:', typeof (chunk))
                let obj = JSON.parse(chunk.trim())
                console.log('putInDiffInfo msg:', obj)
                if (res.statusCode == 200) { //404失败
                    return resolve()
                } else {
                    console.error('uuid不同,服务要处理的文件目录与客户端提交目录不同!', '客户端uuid:', diffInfo.uuid, '服务当前处理的uuid:', obj['curr_uuid'])
                    return reject()
                }
            })
        })
        request.write(diffInfo_data)
        request.end()
    })
}

//上传差异zip (客户端要上传的源文件取md5,服务器最终处理完的文件再去md5 判断差异上传是否成功)
function c2s_uploadDiffZip(diffZipPath: string) {
    console.log('上传差异zip:', diffZipPath)
    return new Promise((resolve, reject) => {
        if (fs.statSync(diffZipPath).isFile()) {
            let buf = fs.readFileSync(diffZipPath)
            let c2s_uploadDiffZip_options = {
                hostname: SERVER_IP,
                port: SERVER_PORT,
                path: '/uploadDiffZip',
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
            //{c_zipSize:number,s_zipSize:number,code:number}
            let request = http.request(c2s_uploadDiffZip_options, (res: http.IncomingMessage) => {
                res.connection.setTimeout(0)
                res.setEncoding('utf8')
                res.on('data', (chunk: string) => {
                    //console.log('data:', chunk, 'type:', typeof (chunk))
                    let obj = JSON.parse(chunk.trim())
                    console.log('putInDiffInfo msg:', obj)
                    if (res.statusCode == 200 && obj['code'] == 200) { //
                        console.log('差异上传成功!')
                        return resolve()
                    } else {
                        console.error('差异上传失败!')
                        return reject()
                    }
                })
            })
            request.write(buf)
            request.end()
        } else {
            console.error('上传差异zip 要上传的资源不是文件:', diffZipPath)
            return reject()
        }
    })
}

function start() {
    let _diffInfo: DiffInfo = null
    let outPath = '' //差异zip路径
    console.log('请求差异文件')
    c2s_getDirInfo().then((data) => {
        // console.log('then_s_dirInfo: data->', data)

        // console.log('then_s_dirInfo: s_dirInfo->', s_dirInfo.rootName)
        //对比拿到diffInfo
        return new Promise(resolve => {
            let s_dirInfo = <DirInfo>data
            wantUploadZipPath = `${c_resMap.resDir}${SEP}${s_dirInfo.rootName}.zip`
            handleWantUploadZip(wantUploadZipPath, s_dirInfo, (diffInfo: DiffInfo) => {
                return resolve(diffInfo)
            })
        })
    }).then((data) => {
        //根据diffInfo取出差异文件
        return new Promise(resolve => {
            let diffInfo = <DiffInfo>data
            _diffInfo = myTools.copyObject(diffInfo)
            console.log('客户端得到的差异信息:', _diffInfo)
            updateZipByDiffInfo(diffInfo, () => {
                console.log('updateZipByDiffInfo success')
                return resolve()
            })
        })
            //差异文件压缩
            .then(() => {
                let srcPath = `${c_resMap.diffZipDir}${SEP}${wantUploadZip}`
                outPath = `${srcPath}.zip`
                return myTools.zip(srcPath, outPath)
            })
            .then(() => {
                console.log('差异文件压缩 成功!', outPath)
                return new Promise(resolve => {
                    myTools.getMd5(outPath, (md5) => {
                        console.log('客户端差异文件:', outPath)
                        console.log('客户端差异文件的md5:', md5)
                        _diffInfo.diffZip_md5 = md5
                        return resolve()
                    })
                })

            })
            //向服务器提交diffInfo文件 服务确认uuid是否匹配
            .then(() => {
                console.log('客户端提交差异信息给服务器')
                return c2s_putDiffInfo(_diffInfo)
            })
            //上传差异zip
            .then(() => {
                console.log('等待服务器差异上传处理...')
                return c2s_uploadDiffZip(outPath)
            })
        //上传成功, 删除中间文件
    })

    //  c2s_getDirInfo()

}

start()


function test() {
    //HandleZipByDiffInfo__test()

    // let diffInfo: DiffInfo = new DiffInfo('wwx', '123abc')
    // c2s_putDiffInfo(diffInfo)

    // let str = ''


    // let testPath = `${c_resMap.diffZipDir}${SPRIT}${testZipName}.zip`
    // c2s_uploadDiffZip(testPath)

    let testPath_2 = `${c_resMap.resDir}${SEP}${wantUploadZip}`
    let testPath_3 = `${c_resMap.resDir}${SEP}${wantUploadZip}.zip`


    // myTools.getMd5(testPath_1, (str) => {
    //     console.log(`${testPath_1}文件的md5值为:`, str)
    // })

    // myTools.getMd5(testPath_3, (str) => {
    //     console.log(`${testPath_3}文件的md5值为:`, str)
    // })
    // myTools.zip(testPath_2, testPath_3).then(() => {
    //     myTools.getMd5(testPath_3, (str) => {
    //         console.log(`${testPath_3}文件的md5值为:`, str)
    //     })
    // })
    //myTools.unzip(`${c_resMap.diffZipDir}${SEP}${wantUploadZip}.zip`)
    let src = `${c_resMap.resDir}${SEP}testDir${SEP}__local_aars___D__CocosCreator_resources_cocos2d_x_cocos_platform_android_java_libs_android_async_http_1_4_9_jar_unspecified_jar.xml`
    let des = `${c_resMap.resDir}${SEP}testDir_copy${SEP}__local_aars___D__CocosCreator_resources_cocos2d_x_cocos_platform_android_java_libs_android_async_http_1_4_9_jar_unspecified_jar.xml`
    fs.copyFileSync(src, des)
}
//test()

export { c_resMap }

//处理目录信息
