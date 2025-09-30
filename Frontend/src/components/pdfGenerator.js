import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

/**
 * Generador de PDF minimalista para Wine Nails Spa
 * Diseño limpio y profesional con máximo ahorro de tinta
 */

// Configuración minimalista
const STYLES = {
  colors: {
    black: "#000000",
    darkGray: "#333333",
    gray: "#666666",
    lightGray: "#999999",
    white: "#ffffff",
    success: "#28a745",
    danger: "#dc3545",
  },
  fonts: {
    title: { size: 18, style: "bold" },
    subtitle: { size: 14, style: "bold" },
    normal: { size: 10, style: "normal" },
    small: { size: 8, style: "normal" },
  },
}

// Convertir color hex a RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [Number.parseInt(result[1], 16), Number.parseInt(result[2], 16), Number.parseInt(result[3], 16)]
    : [0, 0, 0]
}

// Formatear moneda
const formatCurrency = (value) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value)
}

// Formatear fecha simple
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("es-CO")
}

// Verificar autoTable
export const checkAutoTableAvailability = () => {
  try {
    return typeof autoTable === "function"
  } catch (error) {
    return false
  }
}

/**
 * Genera PDF minimalista
 */
export const generateCompraPDF = (compra) => {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const margin = 20

    // ===== ENCABEZADO SIMPLE =====
    let yPos = 25

    // Logo (si está disponible)
    try {
      const logoPath = "/src/assets/Logo.jpg"
      doc.addImage(logoPath, "JPEG", margin, yPos - 5, 25, 25)

      // Información de la empresa al lado del logo
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.setTextColor(...hexToRgb(STYLES.colors.black))
      doc.text("WINE NAILS SPA", margin + 35, yPos + 5)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.setTextColor(...hexToRgb(STYLES.colors.gray))
      doc.text("Comprobante de Compra", margin + 35, yPos + 12)
    } catch (error) {
      // Sin logo
      doc.setFont("helvetica", "bold")
      doc.setFontSize(18)
      doc.setTextColor(...hexToRgb(STYLES.colors.black))
      doc.text("WINE NAILS SPA", margin, yPos)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(12)
      doc.setTextColor(...hexToRgb(STYLES.colors.gray))
      doc.text("Comprobante de Compra", margin, yPos + 8)
    }

    // Número de compra (derecha)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(...hexToRgb(STYLES.colors.black))
    doc.text(`#${compra.id}`, pageWidth - margin, yPos + 5, { align: "right" })

    yPos += 35

    // ===== INFORMACIÓN BÁSICA =====
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(...hexToRgb(STYLES.colors.black))

    // Fecha
    doc.text("Fecha:", margin, yPos)
    doc.text(formatDate(compra.fecha), margin + 25, yPos)

    // Proveedor
    doc.text("Proveedor:", margin, yPos + 8)
    doc.text(compra.proveedor_nombre || "Sin proveedor", margin + 25, yPos + 8)

    // Estado
    doc.text("Estado:", margin, yPos + 16)
    const estadoColor = compra.estado === "finalizada" ? STYLES.colors.success : STYLES.colors.danger
    doc.setTextColor(...hexToRgb(estadoColor))
    doc.text(compra.estado === "finalizada" ? "FINALIZADA" : "ANULADA", margin + 25, yPos + 16)

    // Código de factura (si existe)
    if (compra.codigo_factura && compra.codigo_factura.trim()) {
      doc.text("Código Factura:", margin, yPos + 24)
      doc.text(compra.codigo_factura, margin + 35, yPos + 24)
    }

    // Resumen de totales (derecha)
    doc.setTextColor(...hexToRgb(STYLES.colors.black))
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("SUBTOTAL:", pageWidth - margin - 50, yPos + 8)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(formatCurrency(compra.subtotal || 0), pageWidth - margin, yPos + 8, { align: "right" })

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("IVA (19%):", pageWidth - margin - 50, yPos + 16)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(formatCurrency(compra.iva || 0), pageWidth - margin, yPos + 16, { align: "right" })

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("TOTAL:", pageWidth - margin - 50, yPos + 24)
    doc.setFontSize(16)
    doc.text(formatCurrency(compra.total), pageWidth - margin, yPos + 24, { align: "right" })

    yPos += 35

    // ===== OBSERVACIONES (si existen) =====
    if (compra.observaciones && compra.observaciones.trim()) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(...hexToRgb(STYLES.colors.black))
      doc.text("Observaciones:", margin, yPos)

      doc.setFont("helvetica", "normal")
      doc.setTextColor(...hexToRgb(STYLES.colors.darkGray))
      const observacionesLineas = doc.splitTextToSize(compra.observaciones, pageWidth - margin * 2)
      doc.text(observacionesLineas, margin, yPos + 8)

      yPos += 20 + observacionesLineas.length * 4
    }

    // ===== TABLA DE DETALLES =====
    if (compra.detalles && compra.detalles.length > 0) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.setTextColor(...hexToRgb(STYLES.colors.black))
      doc.text("Detalles", margin, yPos)

      yPos += 10

      // Preparar datos
      const tableData = compra.detalles.map((item, index) => [
        (index + 1).toString(),
        item.insumo_nombre || item.nombre || "Sin nombre",
        item.cantidad.toString(),
        formatCurrency(item.precio_unitario || item.precio),
        formatCurrency((item.precio_unitario || item.precio) * item.cantidad),
      ])

      // Tabla minimalista
      autoTable(doc, {
        startY: yPos,
        head: [["#", "Insumo", "Cant.", "Precio", "Subtotal"]],
        body: tableData,
        theme: "plain",
        styles: {
          fontSize: 9,
          cellPadding: 4,
          textColor: hexToRgb(STYLES.colors.black),
          lineColor: hexToRgb(STYLES.colors.lightGray),
          lineWidth: 0.1,
        },
        headStyles: {
          fontStyle: "bold",
          textColor: hexToRgb(STYLES.colors.black),
          fillColor: false,
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 15 },
          1: { cellWidth: 80 },
          2: { halign: "center", cellWidth: 20 },
          3: { halign: "right", cellWidth: 30 },
          4: { halign: "right", cellWidth: 35, fontStyle: "bold" },
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          // Encabezado simple en páginas adicionales
          if (data.pageNumber > 1) {
            doc.setFont("helvetica", "normal")
            doc.setFontSize(10)
            doc.setTextColor(...hexToRgb(STYLES.colors.gray))
            doc.text(`Wine Nails Spa - Compra #${compra.id}`, pageWidth / 2, 15, { align: "center" })
          }
        },
      })

      // Resumen de totales
      const finalY = doc.lastAutoTable.finalY + 10

      doc.setDrawColor(...hexToRgb(STYLES.colors.lightGray))
      doc.setLineWidth(0.5)
      doc.line(pageWidth - margin - 70, finalY, pageWidth - margin, finalY)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(...hexToRgb(STYLES.colors.black))
      doc.text("SUBTOTAL:", pageWidth - margin - 50, finalY + 8)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.text(formatCurrency(compra.subtotal || 0), pageWidth - margin, finalY + 8, { align: "right" })

      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("IVA (19%):", pageWidth - margin - 50, finalY + 16)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.text(formatCurrency(compra.iva || 0), pageWidth - margin, finalY + 16, { align: "right" })

      doc.setDrawColor(...hexToRgb(STYLES.colors.lightGray))
      doc.setLineWidth(0.5)
      doc.line(pageWidth - margin - 70, finalY + 20, pageWidth - margin, finalY + 20)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("TOTAL:", pageWidth - margin - 50, finalY + 28)
      doc.setFontSize(14)
      doc.text(formatCurrency(compra.total), pageWidth - margin, finalY + 28, { align: "right" })
    }

    // ===== PIE DE PÁGINA SIMPLE =====
    const totalPages = doc.internal.getNumberOfPages()

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(...hexToRgb(STYLES.colors.lightGray))

      const fechaGeneracion = new Date().toLocaleDateString("es-CO")
      doc.text(`Generado: ${fechaGeneracion}`, margin, pageHeight - 10)
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" })
    }

    // Guardar
    const fechaFormateada = new Date(compra.fecha).toLocaleDateString("es-CO").replace(/\//g, "-")
    const nombreArchivo = `Compra_${compra.id}_${fechaFormateada}.pdf`
    doc.save(nombreArchivo)

    return true
  } catch (error) {
    console.error("Error al generar PDF:", error)
    alert("Error al generar el PDF")
    return false
  }
}

/**
 * Versión simple sin autoTable
 */
export const generateCompraPDFSimple = (compra) => {
  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const margin = 20

    let yPos = 25

    // Encabezado
    try {
      const logoPath = "/src/assets/Logo.jpg"
      doc.addImage(logoPath, "JPEG", margin, yPos - 5, 25, 25)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.setTextColor(...hexToRgb(STYLES.colors.black))
      doc.text("WINE NAILS SPA", margin + 35, yPos + 5)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.text("Comprobante de Compra", margin + 35, yPos + 12)
    } catch (error) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(18)
      doc.text("WINE NAILS SPA", margin, yPos)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(12)
      doc.text("Comprobante de Compra", margin, yPos + 8)
    }

    // Número
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text(`#${compra.id}`, pageWidth - margin, yPos + 5, { align: "right" })

    yPos += 35

    // Información
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)

    doc.text("Fecha:", margin, yPos)
    doc.text(formatDate(compra.fecha), margin + 25, yPos)

    doc.text("Proveedor:", margin, yPos + 8)
    doc.text(compra.proveedor_nombre || "Sin proveedor", margin + 25, yPos + 8)

    doc.text("Estado:", margin, yPos + 16)
    const estadoColor = compra.estado === "finalizada" ? STYLES.colors.success : STYLES.colors.danger
    doc.setTextColor(...hexToRgb(estadoColor))
    doc.text(compra.estado === "finalizada" ? "FINALIZADA" : "ANULADA", margin + 25, yPos + 16)

    // Código de factura (si existe)
    if (compra.codigo_factura && compra.codigo_factura.trim()) {
      doc.setTextColor(...hexToRgb(STYLES.colors.black))
      doc.text("Código Factura:", margin, yPos + 24)
      doc.text(compra.codigo_factura, margin + 35, yPos + 24)
    }

    // Resumen de totales (derecha)
    doc.setTextColor(...hexToRgb(STYLES.colors.black))
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("SUBTOTAL:", pageWidth - margin - 50, yPos + 8)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(formatCurrency(compra.subtotal || 0), pageWidth - margin, yPos + 8, { align: "right" })

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("IVA (19%):", pageWidth - margin - 50, yPos + 16)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(formatCurrency(compra.iva || 0), pageWidth - margin, yPos + 16, { align: "right" })

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("TOTAL:", pageWidth - margin - 50, yPos + 24)
    doc.setFontSize(16)
    doc.text(formatCurrency(compra.total), pageWidth - margin, yPos + 24, { align: "right" })

    yPos += 35

    // Observaciones
    if (compra.observaciones && compra.observaciones.trim()) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("Observaciones:", margin, yPos)

      doc.setFont("helvetica", "normal")
      const observacionesLineas = doc.splitTextToSize(compra.observaciones, pageWidth - margin * 2)
      doc.text(observacionesLineas, margin, yPos + 8)

      yPos += 20 + observacionesLineas.length * 4
    }

    // Detalles simples
    if (compra.detalles && compra.detalles.length > 0) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("Detalles", margin, yPos)

      yPos += 10

      // Encabezados
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.text("#", margin, yPos)
      doc.text("Insumo", margin + 15, yPos)
      doc.text("Cant.", margin + 100, yPos)
      doc.text("Precio", margin + 125, yPos)
      doc.text("Subtotal", margin + 155, yPos)

      yPos += 8

      // Línea
      doc.setDrawColor(...hexToRgb(STYLES.colors.lightGray))
      doc.setLineWidth(0.3)
      doc.line(margin, yPos, pageWidth - margin, yPos)

      yPos += 5

      // Datos
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)

      compra.detalles.forEach((item, index) => {
        doc.text((index + 1).toString(), margin, yPos)

        const nombre = item.insumo_nombre || item.nombre || "Sin nombre"
        const nombreCorto = nombre.length > 30 ? nombre.substring(0, 27) + "..." : nombre
        doc.text(nombreCorto, margin + 15, yPos)

        doc.text(item.cantidad.toString(), margin + 100, yPos)
        doc.text(formatCurrency(item.precio_unitario || item.precio), margin + 125, yPos)
        doc.text(formatCurrency((item.precio_unitario || item.precio) * item.cantidad), margin + 155, yPos)

        yPos += 6
      })

      // Resumen de totales
      yPos += 5
      doc.setDrawColor(...hexToRgb(STYLES.colors.lightGray))
      doc.line(pageWidth - margin - 70, yPos, pageWidth - margin, yPos)

      yPos += 8
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("SUBTOTAL:", pageWidth - margin - 50, yPos)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.text(formatCurrency(compra.subtotal || 0), pageWidth - margin, yPos, { align: "right" })

      yPos += 8
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("IVA (19%):", pageWidth - margin - 50, yPos)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.text(formatCurrency(compra.iva || 0), pageWidth - margin, yPos, { align: "right" })

      yPos += 5
      doc.setDrawColor(...hexToRgb(STYLES.colors.lightGray))
      doc.line(pageWidth - margin - 70, yPos, pageWidth - margin, yPos)

      yPos += 8
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("TOTAL:", pageWidth - margin - 50, yPos)
      doc.text(formatCurrency(compra.total), pageWidth - margin, yPos, { align: "right" })
    }

    // Pie de página
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...hexToRgb(STYLES.colors.lightGray))

    const fechaGeneracion = new Date().toLocaleDateString("es-CO")
    doc.text(`Generado: ${fechaGeneracion}`, margin, pageHeight - 10)
    doc.text("Wine Nails Spa", pageWidth - margin, pageHeight - 10, { align: "right" })

    // Guardar
    const fechaFormateada = new Date(compra.fecha).toLocaleDateString("es-CO").replace(/\//g, "-")
    const nombreArchivo = `Compra_${compra.id}_${fechaFormateada}.pdf`
    doc.save(nombreArchivo)

    return true
  } catch (error) {
    console.error("Error al generar PDF simple:", error)
    alert("Error al generar el PDF")
    return false
  }
}
