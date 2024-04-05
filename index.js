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
    console.log(`FILM ${d.name}:`)
    console.log(PART_PATHS.map((p) => ` - PART ${p.name}`).join("\n"))

    const sorted = PART_PATHS.map((p) => {
        try {
            return {
                "filename": p.name,
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

    console.log(`Encoding film ${d.name}...`)
    const encoder = ffmpeg()
    sorted.forEach((v) => encoder.input(v.part))
    
    encoder
    // replicates film encoder settings (i tried using copy streams but failed)
    .outputOptions([
        '-c:v libvpx',
        '-c:a libvorbis',
        `-b:v ${((25 * 1024 * 1024 * 8) / 90) * 0.9}`, // 90% of discord's 25mb limit
        '-ar 24000',
        '-ac 2',
    ])
    .outputFormat("webm")
    .mergeToFile(`./output/${d.name}.webm`)
    .on("error", (err) => console.error(`ERROR ENCODING FILM ${d.name}:`, err))
    .on("end", () => console.log(`Finished encoding film ${d.name}`))
})