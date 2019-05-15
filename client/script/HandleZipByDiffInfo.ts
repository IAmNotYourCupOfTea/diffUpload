import { DiffInfo, DirInfoItem, eFileType } from "../../common/Beans";
import * as fs from 'fs-extra'
import { c_resMap } from "../c_index";
import { SEP } from "../../common/config";
//根据diffInfo 更新zip包
function updateZipByDiffInfo(diffInfo: DiffInfo, cb: () => void) {
    // console.log('updateZipByDiffInfo:', diffInfo)
    let addArr = diffInfo.addInfoItemArr.slice()
    //目录和文件分离 目录diffZip
    let dirArr_diffzip: DirInfoItem[] = [] //diffzip路径下
    let fileArr_diffzip: DirInfoItem[] = []
    let dirUrlArr_unzip: string[] = [] //unzip路径下
    let fileUrlArr_unzip: string[] = []

    for (let index = 0; index < addArr.length; index++) {
        let element = addArr[index];
        let unzipDirUrl = pathChange_unzipDir(element.url)
        element.url = pathChange_diffZipDir(element.url)
        if (element.type == eFileType.directory) {
            dirArr_diffzip.push(element)
            dirUrlArr_unzip.push(unzipDirUrl)
        } else {
            fileArr_diffzip.push(element)
            fileUrlArr_unzip.push(unzipDirUrl)
        }
    }
    //在diffZip路径下创建目录
    for (let str of dirArr_diffzip) {
        let dirPath = str.url
        fs.mkdirpSync(dirPath)
    }
    //拷贝文件
    for (let i = 0; i < fileArr_diffzip.length; i++) {
        let src = fileUrlArr_unzip[i]
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

function pathChange_unzipDir(zipUrl: string) {
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