const fs = require("fs")
const path = require("path")
const ffmpeg = require("fluent-ffmpeg")

process.on("uncaughtException", (err) =>{
    console.log("Uncaught Exception:", err)
    process.exit(1)
})
if(!process.env.APPDATA)throw new Error("cannot find %appdata% path. are you running a non-Windows OS?")
const FILM_ROOT = path.join(process.env.APPDATA, "..", "Local/Temp/rec")
console.log(`reading film paths in ${FILM_ROOT}`)
const FILM_PATHS = fs.readdirSync(FILM_ROOT, {"withFileTypes": true}).filter((d) => d.isDirectory())
FILM_PATHS.forEach((d) => {
    const PART_PATHS = fs.readdirSync(path.join(d.path, d.name), {"withFileTypes": true}).filter((p) => p.isDirectory())

    const sorted = PART_PATHS.map((p) => {
        try {
            return {
                "name": p.name,
                "path": p.path,
                "part": path.join(p.path, p.name, "output.webm"),
                "ts": fs.lstatSync(path.join(p.path, p.name, "output.webm")).birthtimeMs
            }
        } catch (err) {
            console.log(`ignoring file: ${path.join(p.path, p.name, "output.webm")}`)
            return null
        }
    })
    .filter((v) => !!v.ts)
    .sort((a, b) => a.ts - b.ts)

    console.log(`FILM ${d.name}:`)
    console.log(sorted.map((p) => ` - PART ${p.name}`).join("\n"))
    console.log(`Encoding film ${d.name}...`)
    
    // replicate how the original game stores part lists
    const LIST_PATH = path.join(d.path, d.name, "videoList.txt")
    fs.writeFileSync(LIST_PATH, sorted.map((v) => `file '${v.part}'`).join("\n"))

    const encoder = ffmpeg(LIST_PATH)

    encoder
    .inputOptions(['-f concat', '-safe 0'])
    .outputOptions('-c copy')
    .save(path.resolve(`./output/${d.name}.webm`))
})