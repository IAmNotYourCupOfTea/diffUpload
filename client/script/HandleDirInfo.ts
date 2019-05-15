import { myTools } from "../../common/MyTools";
import * as fs from 'fs'
import { c_resMap } from "../c_index";
import { SEP } from "../../common/config";
import { DirInfoManager } from "../../common/DirInfoManager";
import { DirInfo, DirInfoItem, DiffInfo } from "../../common/Beans";

/**
 * 客户端处理服务器发来的dirInfo 得到差异描述文件
 */

/**
* 处理要上传的zip 或者 目录
* @param filePath 
*/
function handleWantUploadZip(filePath: string, s_dirInfo: DirInfo, cb: (diffInfo: DiffInfo) => void) {
    console.log('handleWantUploadZip', filePath, s_dirInfo)
    //是zip
    if (fs.statSync(filePath).isFile() && myTools.getExtension(filePath) == 'zip') {
        let fileName = myTools.getFileName(filePath, true)
        let outPut = myTools.getParentRoot(filePath)
        new Promise((resolve) => {
            // //取要上传文件md5
            // myTools.getMd5(path, (md5) => {
            //     md5Str = md5
            //     console.log(`${path}文件的md5:`, md5Str)
            //     return resolve()
            // })
            //zipSize = fs.statSync(filePath).size
            return resolve()
        }).then(() => {
            //解压
            return myTools.unzip(filePath)
        })
            //获取diffInfo
            .then(() => {
                let dirPath = `${outPut}${SEP}${fileName}`
                console.log('handleWantUploadZip_then:', s_dirInfo)
                let c_dirInfoMan = new DirInfoManager(dirPath, s_dirInfo.uuid)
                let c_dirInfo = c_dirInfoMan.getDirInfo()
                console.log('c_dirInfo:', c_dirInfo)
                let diffInfo = compDirInfo(c_dirInfo, s_dirInfo)
                //diffInfo.zipSize = zipSize
                return cb(diffInfo)
            })
    } else {
        console.error('handleWantUploadZip 不是一个文件', filePath)
    }
}

/**
 * 比较客户端与服务器目录配置文件差异
 * @param c_dirInfo 
 * @param s_dirInfo 
 */
function compDirInfo(c_dirInfo: DirInfo, s_dirInfo: DirInfo) {
    if (s_dirInfo.isExist) {
        console.log('服务器没有缓存,将该zip全部上传')
    }
    if (c_dirInfo.rootName != s_dirInfo.rootName) {
        console.error('客户端与服务器目录配置文件根目录不同',
            c_dirInfo.rootName, s_dirInfo.rootName)
        return null
    } else {
        let c_itemArr = c_dirInfo.dirInfoItemArr
        let s_itemArr = s_dirInfo.dirInfoItemArr
        let diffInfo = new DiffInfo(s_dirInfo.rootName, s_dirInfo.uuid)
        for (const c of c_itemArr) {
            findItem(c, s_itemArr, diffInfo)
        }
        handleDeleteInfoItemArr(c_dirInfo, s_dirInfo, diffInfo)
        console.log('diffInfo:', diffInfo)
        return diffInfo
    }

}
//去除'\\' windows生成路径转json保存会生成\\
function handleDoubleSprit() {

}

/**
 * 处理新增文件
 * @param item 
 * @param s_itemArr 
 * @param diffInfo 
 */
function findItem(item: DirInfoItem, s_itemArr: DirInfoItem[], diffInfo: DiffInfo) {
    for (const s of s_itemArr) {
        if (item.type == s.type && item.url == s.url) {
            console.log('findItem', '相同文件:', item)
            diffInfo.sameInfoItemArr.push(item)
            return
        }
    }
    //未找到新增信息
    diffInfo.addInfoItemArr.push(item)
    console.log('findItem', '新增文件:', item)
}


//处理删除的文件
function handleDeleteInfoItemArr(c_dirInfo: DirInfo, s_dirInfo: DirInfo, diffInfo: DiffInfo) {
    let deleteArr: DirInfoItem[] = []
    for (const s_item of s_dirInfo.dirInfoItemArr) {
        if (!findItem_same(s_item, diffInfo)) {
            deleteArr.push(s_item)
        }
    }
    diffInfo.deleteInfoItemArr = deleteArr.slice()
}

function findItem_same(item: DirInfoItem, diffInfo: DiffInfo) {
    for (const d_item of diffInfo.sameInfoItemArr) {
        if (d_item.type == item.type && d_item.url == item.url) {
            return true
        }
    }
    return false
}


//test 
export function handleDirInfo_test() {
    // let path = `${c_resMap.res}${SPRIT}GamingDragon.zip`
    // handleWantUploadZip(path, '123')
}

export { handleWantUploadZip }

