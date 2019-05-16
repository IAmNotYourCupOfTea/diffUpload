import { DiffInfo, DirInfoItem, eFileType } from "../../common/Beans";
import * as fs from 'fs-extra'
import { s_resMap } from "../s_index";
import { SEP } from "../../common/config";
import { myTools } from "../../common/MyTools";
/**
 * 处理服务器差异包处理
 * @param diffInfo //差异描述对象
 * @param uploadZip //上传的zip路径
 * @param srcPath  //操作资源目录
 */
export function handleDiffUplaod(diffInfo: DiffInfo, uploadZip: string, srcPath: string, cb: () => void) {
    let zipName = diffInfo.rootName
    let outputDir_name = `${s_resMap.outputDir}${SEP}${zipName}`
    let outputDir_zip = `${outputDir_name}.zip`


    let srcZipPath = `${s_resMap.resDir}${SEP}${zipName}.zip`
    if (!fs.existsSync(srcPath)) {
        //服务器没有该目录 第一次上传
        console.log('服务器没有缓存该目录,第一次上传', srcPath)
        if (diffInfo.deleteInfoItemArr.length != 0 && diffInfo.sameInfoItemArr.length != 0) {
            console.error('服务器没有暂存该目录时 删除,相同文件应当为0',
                diffInfo.deleteInfoItemArr.length, diffInfo.sameInfoItemArr.length)
            return
        }
        myTools.moveFileSync(uploadZip, outputDir_zip)
        myTools.unzip(outputDir_zip).then(() => {
            cb()
        })
    } else {
        console.log('服务器有缓存文件 进行增删处理')
        myTools.zip(srcPath, srcZipPath)
            .then(() => {
                return new Promise((resolve, reject) => {
                    console.log('从res目录拷贝要操作的zip到output目录下')
                    fs.copyFileSync(srcZipPath, outputDir_zip)
                    //解压备份的文件
                    myTools.unzip(outputDir_zip).then(() => {
                        console.log('服务暂存文件备份解压成功')
                        return resolve()
                    })
                })
            })
            .then(() => {
                return new Promise(resolve => {
                    for (let del of diffInfo.deleteInfoItemArr.slice()) {
                        myTools.deleteFileOrDir(pathChange_output(del.url))
                    }
                    console.log('删除多余文件成功')
                    //创建文件
                    let dirArr: DirInfoItem[] = [] //目录
                    let fileArr: DirInfoItem[] = [] //文件
                    for (let add of diffInfo.addInfoItemArr.slice()) {
                        if (add.type == eFileType.file) {
                            fileArr.push(add)
                        } else {
                            dirArr.push(add)
                        }
                    }
                    console.log('分离要操作的目录和文件成功')
                    //创建目录
                    for (let dir of dirArr) {
                        // console.log('创建目录:', pathChange_res(dir.url))
                        fs.mkdirpSync(pathChange_output(dir.url))
                    }
                    if (dirArr.length == 0 && fileArr.length != 0) {
                        console.log('上传文件中没有文件夹,先创建一个根目录')
                        let rootPath = pathChange_output(myTools.getParentRoot(fileArr[0].url))
                        fs.mkdirpSync(rootPath)
                    }
                    console.log('创建目录成功')
                    //解压upploadzip 
                    myTools.unzip(uploadZip).then(() => {
                        console.log('解压客户端上传的差异文件')
                        //拷贝文件 upload => output
                        for (let i = 0; i < fileArr.length; i++) {
                            let fileItem = fileArr[i];
                            let scr = pathChange_upload(fileItem.url)
                            let dest = pathChange_output(fileItem.url)
                            fs.copyFileSync(scr, dest)
                        }
                        console.log('拷贝文件成功')
                        return resolve()
                    })
                })

            })
            .then(() => {
                //压缩处理后的文件
                fs.removeSync(outputDir_zip)
                console.log('删除output目录下旧的zip')
                return myTools.zip(outputDir_name, outputDir_zip)
            })
            .then(() => {
                cb()
            })
    }



}
//路径替换为服务器对应目录
function pathChange_output(diffFilePath: string) {
    return `${s_resMap.outputDir}${SEP}` + diffFilePath
}

///路径替换为服务器对应目录
function pathChange_upload(diffFilePath: string) {
    return `${s_resMap.uploadDir}${SEP}` + diffFilePath
}

//上传成功之后 更新res 下目录  并没有删除output目录下的文件
export function updateResDir(currHandleDirName: string, cb: () => void) {
    let outPutDir_file = `${s_resMap.outputDir}${SEP}${currHandleDirName}`
    let resDir_file = `${s_resMap.resDir}${SEP}${currHandleDirName}`
    let outPutDir_zip = `${outPutDir_file}.zip`
    let resDir_zip = `${resDir_file}.zip`

    if (!fs.existsSync(resDir_file)) {
        console.log('上传成功之后 更新res下目录', '第一次上传')
        //拷贝outputDir-zip 到res下
        if (fs.existsSync(resDir_zip)) {
            myTools.deleteFileOrDir(resDir_file)
        }
        fs.copyFileSync(outPutDir_zip, resDir_zip)
        myTools.unzip(resDir_zip).then(() => {
            cb()
        })
    } else {
        if (fs.existsSync(resDir_file)) {
            myTools.deleteFileOrDir(resDir_file)
        }
        if (fs.existsSync(resDir_zip)) {
            myTools.deleteFileOrDir(resDir_zip)
        }
        fs.copyFileSync(outPutDir_zip, resDir_zip)
        myTools.unzip(resDir_zip).then(() => {
            cb()
        })
    }
}