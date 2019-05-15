//目录描述类
export class DirInfo {
    rootName: string //根目录名字
    uuid: string //校验码
    dirInfoItemArr: DirInfoItem[]
    isExist: boolean  //是否存在该目录
    constructor(rootName: string, uuid: string, isExist: boolean, dirInfoItem?: DirInfoItem[]) {
        this.rootName = rootName
        this.uuid = uuid
        this.isExist = isExist
        this.dirInfoItemArr = dirInfoItem ? dirInfoItem : []
    }
}
//一条目录
export class DirInfoItem {
    type: eFileType
    url: string
    constructor(type: eFileType, url: string) {
        this.type = type
        this.url = url
    }
}
//文件类型 目录or文件
export enum eFileType {
    file = 0,
    directory = 1,
}

/**
 * 差异文件描述
 * c_dirInfo - s_dirInfo = [same,add]
 * s_dirInfo - same = delete (删除delete配置中目录文件)
 * s_dirInfo - same + add = end (添加add配置中的文件)
 */

export class DiffInfo {
    rootName: string
    uuid: string
    diffZip_md5: string //校验客户端上传zip 是否成功
    sameInfoItemArr: DirInfoItem[] //相同文件信息
    addInfoItemArr: DirInfoItem[] //新增文件信息
    deleteInfoItemArr: DirInfoItem[] //已经删除的文件信息
    constructor(rootName: string, uuid: string) {
        this.uuid = uuid
        this.rootName = rootName
        this.addInfoItemArr = []
        this.deleteInfoItemArr = []
        this.sameInfoItemArr = []
    }
}
