// CSV text cells are guarded against spreadsheet formula evaluation. Numeric
// cells are emitted from trusted numeric database fields without modification.
function csvCell(value, text = true) {
	let output = value == null ? "" : String(value);
	if (text && /^[\s]*[=+\-@]/.test(output)) output = `'${output}`;
	return `"${output.replaceAll('"', '""')}"`;
}

function csvDocument(headers, rows) {
	return `\uFEFF${[headers, ...rows].map((row, index) => row.map((cell) =>
		index === 0 ? csvCell(cell) : csvCell(cell.value, cell.text !== false),
	).join(",")).join("\r\n")}\r\n`;
}

export { csvCell, csvDocument };
