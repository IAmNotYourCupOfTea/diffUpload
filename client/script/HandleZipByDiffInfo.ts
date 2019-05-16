import { DiffInfo, DirInfoItem, eFileType } from "../../common/Beans";
import * as fs from 'fs-extra'
import { c_resMap } from "../c_index";
import { SEP } from "../../common/config";
import { myTools } from "../../common/MyTools";
//根据diffInfo 更新zip包
function updateZipByDiffInfo(diffInfo: DiffInfo, cb: () => void) {

    //清空已有的diff文件
    let rootPath = `${c_resMap.diffZipDir}${SEP}${diffInfo.rootName}`
    if (fs.existsSync(rootPath)) {
        fs.removeSync(rootPath)
    }

    // console.log('updateZipByDiffInfo:', diffInfo)
    let addArr = diffInfo.addInfoItemArr.slice()
    //目录和文件分离 目录diffZip
    let dirArr_diffzip: DirInfoItem[] = [] //diffzip路径下
    let fileArr_diffzip: DirInfoItem[] = []
    let dirUrlArr_res: string[] = [] //res路径下
    let fileUrlArr_res: string[] = []

    for (let index = 0; index < addArr.length; index++) {
        let element = addArr[index];
        let resDirUrl = pathChange_resDir(element.url)
        element.url = pathChange_diffZipDir(element.url)
        if (element.type == eFileType.directory) {
            dirArr_diffzip.push(element)
            dirUrlArr_res.push(resDirUrl)
        } else {
            fileArr_diffzip.push(element)
            fileUrlArr_res.push(resDirUrl)
        }
    }
    console.log('新增文件:', fileArr_diffzip)
    console.log('新增目录:', dirArr_diffzip)
    //在diffZip路径下创建目录
    for (let str of dirArr_diffzip) {
        let dirPath = str.url
        fs.mkdirpSync(dirPath)
    }
    if (dirArr_diffzip.length == 0 && fileArr_diffzip.length != 0) {
        console.log('上传文件中没有文件夹,先创建一个根目录')
        let rootPath = myTools.getParentRoot(fileArr_diffzip[0].url)
        fs.mkdirpSync(rootPath)
    }

    //拷贝文件
    for (let i = 0; i < fileArr_diffzip.length; i++) {
        let src = fileUrlArr_res[i]
        let dest = fileArr_diffzip[i].url
        fs.copyFileSync(src, dest)
    }
    cb()
}

//解压过的zip包路径 转 diffZipDir路径
function pathChange_diffZipDir(zipUrl: string) {
    //console.log('pathChange', zipUrl)
    let diffZipDir = c_resMap.diffZipDir
    let result = `${diffZipDir}${SEP}${zipUrl}`
    //console.log('pathChange result', result)
    return result
}

function pathChange_resDir(zipUrl: string) {
    //console.log('pathChange', zipUrl)
    let diffZipDir = c_resMap.resDir
    let result = `${diffZipDir}${SEP}${zipUrl}`
    //console.log('pathChange result', result)
    return result
}



export function HandleZipByDiffInfo__test() {
    // let strArr = ['a\\b\\c', 'a\\b', 'a1']
    // let promiseArr = []
    // for (const str of strArr) {
    //     let p = new Promise(reslove => {
    //         fs.mkdir(`${ c_resMap.diffZipDir }${ SPRIT }${ str }`, { recursive: true }, (err) => {
    //             if (err) {
    //                 console.error(err)
    //             } else {
    //                 console.log('创建目录成功!')
    //                 return reslove()
    //             }
    //         })
    //     })
    //     promiseArr.push(p)
    // }
    // Promise.all(promiseArr).then(() => {
    //     console.log('all done!')
    // })

    let res = `${c_resMap.diffZipDir}${SEP}`
    let fileArr = ['a\\b\\1.data', 'a\\b\\c\\2.data']
    let fileArr_des = ['a1\\1.data', 'a1\\2.data']
    let promiseArr = []
    let i = 0
    for (const str of fileArr) {
        let path = `${c_resMap.diffZipDir}${SEP}${str}`
        let destPath = `${c_resMap.diffZipDir}${SEP}${fileArr_des[i++]}`
        let p = new Promise(reslove => {
            fs.copyFile(path, destPath, (err) => {
                if (err) {
                    console.error(err)
                } else {
                    console.log('拷贝文件成功!', path)
                    return reslove()
                }
            })
        })
        promiseArr.push(p)
    }
    Promise.all(promiseArr).then(() => {
        console.log('all done!')
    })
}

export { updateZipByDiffInfo }