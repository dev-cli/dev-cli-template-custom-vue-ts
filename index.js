const fse = require('fs-extra')
const inquirer = require('inquirer')
const ejs = require('ejs')
const glob = require('glob')
module.exports = async (options) => {
    try {
        const { templatePath, targetPath, projectInfo } = options
        fse.ensureDirSync(templatePath)
        fse.ensureDirSync(targetPath)
        fse.copySync(templatePath, targetPath)
        // 重命名 _gitignore等文件
        rename(targetPath)
        projectInfo.description = await promptDesc()
        const templateIgnore = options.ignore ? options.ignore : []
        const ignore = ['node_modules/**', ...templateIgnore]
        await ejsRender({ ignore, projectInfo })
    } catch (err) {
        throw err
    }
}
async function ejsRender({ ignore = [], projectInfo }) {
    return new Promise((resolve, reject) => {
        const dir = process.cwd()
        glob('**', {
            cwd: dir,
            ignore,
            nodir: true
        }, (err, files) => {
            if (err) reject(err)
            Promise.all(files.map(file => {
                const filePath = path.resolve(dir, file)
                return new Promise((resolve, reject) => {
                    ejs.renderFile(filePath, {
                        ...projectInfo
                    }, {}, (err, res) => {
                        if (err) reject(err)
                        else {
                            fse.writeFile(filePath, res, (err) => {
                                if (err) reject(err)
                                else resolve()
                            })
                        }
                    })
                })
            })).then(resolve)
                .catch(reject)
        })
    })
}
async function promptDesc() {
    const descriptionPrompt = {
        type: 'input',
        name: 'description',
        message: `请输入项目描述信息`,
        default: '',
        validate: function (v) {
            const done = this.async()
            if (!v) {
                done('请输入项目描述信息')
                return
            }
            done(null, true)
        },
    }
    const { description } = await inquirer.prompt([descriptionPrompt])
    return description
}
const renameFiles = {
    _gitignore: '.gitignore'
}
function rename(targetPath) {
    Object.keys(renameFiles).forEach(key => {
        const file = `${targetPath}/${key}`
        if (fse.existsSync(file)) {
            fse.renameSync(file, `${targetPath}/${renameFiles[key]}`)
        }
    })
}