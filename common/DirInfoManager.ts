import * as fs from 'fs'
import { DirInfo, DirInfoItem, eFileType } from './../common/Beans';
import { SEP } from './../common/config';
import { myTools } from './../common/MyTools';

class DirInfoManager {
    private dirName: string
    private dirPath: string
    private absolutePath: string
    private dirInfo: DirInfo
    private uuid: string
    constructor(dirPath: string, uuid: string) {
        this.uuid = uuid
        this.dirName = myTools.getFileName(dirPath, true)
        this.dirPath = dirPath
        this.absolutePath = this.dirPath.split(this.dirName)[0]
        this.dirInfo = this.createDirInfo()
    }

    /**
 * 创建目录信息
 * @param oneDirInfo 同一级目录信息
 */
    private createDirInfo() {
        let dirInfo = new DirInfo(this.dirName, this.uuid, false)
        if (!fs.existsSync(this.dirPath)) {
            dirInfo.rootName = this.dirName
            return dirInfo
        }
        dirInfo.isExist = true
        if (fs.statSync(this.dirPath).isFile()) {
            dirInfo.dirInfoItemArr.push(new DirInfoItem(eFileType.file, this.getRelativePath(this.dirPath)))
        } else {
            this.recursionDir(this.dirPath, dirInfo)
        }
        return dirInfo
    }
    //递归目录
    private recursionDir(path: string, dirInfo: DirInfo) {
        let files: string[] = []
        if (fs.existsSync(path)) {
            files = fs.readdirSync(path)
            files.forEach((file) => {
                let curPath = path + SEP + file
                if (fs.statSync(curPath).isDirectory()) {
                    this.recursionDir(curPath, dirInfo) //是目录递归
                    console.log('目录:', this.getRelativePath(curPath))
                    dirInfo.dirInfoItemArr.push(new DirInfoItem(eFileType.directory, this.getRelativePath(curPath)))
                } else {
                    console.log('文件:', this.getRelativePath(curPath))
                    dirInfo.dirInfoItemArr.push(new DirInfoItem(eFileType.file, this.getRelativePath(curPath)))
                }
            })
        }
    }

    /**
     * 绝对路径转相当跟目录路径
     */
    private getRelativePath(path: string) {
        let strArr = path.split(this.absolutePath)
        let fileName = strArr.pop()
        return fileName ? fileName : ''
    }

    getDirInfo() {
        return this.dirInfo
    }

}




export { DirInfoManager }