function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Composites a client's name + completion date onto the admin-uploaded
 *  certificate template as an SVG — no image-processing native dependency
 *  needed, and it renders/prints perfectly in any browser. */
export function buildCertificateSvg(opts: {
  templateBase64: string
  mimeType: string
  width: number
  height: number
  name: string
  date: string
  namePct: { x: number; y: number }
  datePct: { x: number; y: number }
  fontSize: number
  fontColor: string
  fontFamily: string
}): string {
  const { templateBase64, mimeType, width, height, name, date, namePct, datePct, fontSize, fontColor, fontFamily } = opts
  const nameX = (namePct.x / 100) * width
  const nameY = (namePct.y / 100) * height
  const dateX = (datePct.x / 100) * width
  const dateY = (datePct.y / 100) * height

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="data:${mimeType};base64,${templateBase64}" width="${width}" height="${height}" />
  <text x="${nameX}" y="${nameY}" font-family="${escapeXml(fontFamily)}" font-size="${fontSize}" fill="${fontColor}" text-anchor="middle" dominant-baseline="middle">${escapeXml(name)}</text>
  <text x="${dateX}" y="${dateY}" font-family="${escapeXml(fontFamily)}" font-size="${Math.round(fontSize * 0.55)}" fill="${fontColor}" text-anchor="middle" dominant-baseline="middle">${escapeXml(date)}</text>
</svg>`
}
