import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

/**
 * Generador de PDF minimalista para Wine Nails Spa - Liquidaciones
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
    primary: "#e83e8c",
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
  if (!dateString) return "Fecha no disponible"
  try {
    const [year, month, day] = dateString.toString().split("-")
    const fecha = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
    return fecha.toLocaleDateString("es-CO")
  } catch (error) {
    return new Date(dateString).toLocaleDateString("es-CO")
  }
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
 * Genera PDF de liquidación minimalista
 */
export const generateLiquidacionPDF = (liquidacion, citasDetalle = []) => {
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
      doc.text("Liquidación de Servicios", margin + 35, yPos + 12)
    } catch (error) {
      // Sin logo
      doc.setFont("helvetica", "bold")
      doc.setFontSize(18)
      doc.setTextColor(...hexToRgb(STYLES.colors.black))
      doc.text("WINE NAILS SPA", margin, yPos)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(12)
      doc.setTextColor(...hexToRgb(STYLES.colors.gray))
      doc.text("Liquidación de Servicios", margin, yPos + 8)
    }

    // Número de liquidación (derecha)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(...hexToRgb(STYLES.colors.black))
    doc.text(`#${liquidacion.id}`, pageWidth - margin, yPos + 5, { align: "right" })

    yPos += 35

    // ===== INFORMACIÓN BÁSICA =====
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(...hexToRgb(STYLES.colors.black))

    // Manicurista
    doc.text("Manicurista:", margin, yPos)
    doc.text(liquidacion.manicurista?.nombre || "No disponible", margin + 30, yPos)

    // Período
    doc.text("Período:", margin, yPos + 8)
    doc.text(`${formatDate(liquidacion.fecha_inicio)} - ${formatDate(liquidacion.fecha_final)}`, margin + 30, yPos + 8)

    // Fecha de creación
    doc.text("Fecha creación:", margin, yPos + 16)
    doc.text(
      liquidacion.fecha_creacion ? formatDate(liquidacion.fecha_creacion) : "No disponible",
      margin + 30,
      yPos + 16,
    )

    // Total (derecha)
    doc.setTextColor(...hexToRgb(STYLES.colors.black))
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("TOTAL A PAGAR:", pageWidth - margin - 60, yPos + 8)
    doc.setFontSize(16)
    doc.setTextColor(...hexToRgb(STYLES.colors.primary))
    doc.text(formatCurrency(liquidacion.total_a_pagar || 0), pageWidth - margin, yPos + 8, { align: "right" })

    yPos += 35

    // ===== RESUMEN DE VALORES =====
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(...hexToRgb(STYLES.colors.black))
    doc.text("Resumen de Liquidación", margin, yPos)

    yPos += 10

    // Crear tabla de resumen
    const subtotal = (liquidacion.total_servicios_completados || 0) + (liquidacion.bonificacion || 0)
    const resumenData = [
      ["Servicios Completados", (liquidacion.cantidad_servicios_completados || 0).toString()],
      ["Total Servicios", formatCurrency(liquidacion.total_servicios_completados || 0)],
      ["Bonificación", formatCurrency(liquidacion.bonificacion || 0)],
      ["Subtotal (Sin 50%)", formatCurrency(subtotal)],
      ["Valor Base (Comisión 50%)", formatCurrency(liquidacion.valor || 0)],
    ]

    autoTable(doc, {
      startY: yPos,
      body: resumenData,
      theme: "plain",
      styles: {
        fontSize: 10,
        cellPadding: 4,
        textColor: hexToRgb(STYLES.colors.black),
        lineColor: hexToRgb(STYLES.colors.lightGray),
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 100, fontStyle: "bold" },
        1: { halign: "right", cellWidth: 60, fontStyle: "bold" },
      },
      margin: { left: margin, right: margin },
    })

    yPos = doc.lastAutoTable.finalY + 15

    // ===== OBSERVACIONES (si existen) =====
    if (liquidacion.observaciones && liquidacion.observaciones.trim()) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(...hexToRgb(STYLES.colors.black))
      doc.text("Observaciones:", margin, yPos)

      doc.setFont("helvetica", "normal")
      doc.setTextColor(...hexToRgb(STYLES.colors.darkGray))
      const observacionesLineas = doc.splitTextToSize(liquidacion.observaciones, pageWidth - margin * 2)
      doc.text(observacionesLineas, margin, yPos + 8)

      yPos += 20 + observacionesLineas.length * 4
    }

    // ===== TABLA DE SERVICIOS COMPLETADOS =====
    if (citasDetalle && citasDetalle.length > 0) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.setTextColor(...hexToRgb(STYLES.colors.black))
      doc.text("Detalle de Servicios Completados", margin, yPos)

      yPos += 10

      // Preparar datos de servicios
      const citasData = citasDetalle.map((cita, index) => [
        (index + 1).toString(),
        formatDate(cita.fecha),
        cita.hora || "N/A",
        cita.cliente?.nombre || cita.cliente || "Cliente no disponible",
        Array.isArray(cita.servicios)
          ? cita.servicios.map((s) => s.nombre || s).join(", ")
          : cita.servicios || "Servicio",
        formatCurrency(cita.precio_total || 0),
      ])

      // Tabla de servicios
      autoTable(doc, {
        startY: yPos,
        head: [["#", "Fecha", "Hora", "Cliente", "Servicios", "Total"]],
        body: citasData,
        theme: "plain",
        styles: {
          fontSize: 8,
          cellPadding: 3,
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
          0: { halign: "center", cellWidth: 10 },
          1: { cellWidth: 25 },
          2: { halign: "center", cellWidth: 15 },
          3: { cellWidth: 40 },
          4: { cellWidth: 60 },
          5: { halign: "right", cellWidth: 25, fontStyle: "bold" },
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          // Encabezado simple en páginas adicionales
          if (data.pageNumber > 1) {
            doc.setFont("helvetica", "normal")
            doc.setFontSize(10)
            doc.setTextColor(...hexToRgb(STYLES.colors.gray))
            doc.text(`Wine Nails Spa - Liquidación #${liquidacion.id}`, pageWidth / 2, 15, { align: "center" })
          }
        },
      })

      // Línea de total final
      const finalY = doc.lastAutoTable.finalY + 10

      doc.setDrawColor(...hexToRgb(STYLES.colors.lightGray))
      doc.setLineWidth(0.5)
      doc.line(pageWidth - margin - 70, finalY, pageWidth - margin, finalY)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.setTextColor(...hexToRgb(STYLES.colors.black))
      doc.text("TOTAL A PAGAR:", pageWidth - margin - 50, finalY + 8)
      doc.setFontSize(14)
      doc.setTextColor(...hexToRgb(STYLES.colors.primary))
      doc.text(formatCurrency(liquidacion.total_a_pagar || 0), pageWidth - margin, finalY + 8, { align: "right" })
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
    const manicuristaNombre = liquidacion.manicurista?.nombre || "Manicurista"
    const fechaInicio = formatDate(liquidacion.fecha_inicio).replace(/\//g, "-")
    const nombreArchivo = `Liquidacion_${liquidacion.id}_${manicuristaNombre}_${fechaInicio}.pdf`
    doc.save(nombreArchivo)

    return true
  } catch (error) {
    console.error("Error al generar PDF de liquidación:", error)
    alert("Error al generar el PDF de liquidación")
    return false
  }
}

/**
 * Versión simple sin autoTable para liquidaciones
 */
export const generateLiquidacionPDFSimple = (liquidacion, citasDetalle = []) => {
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
      doc.text("Liquidación de Servicios", margin + 35, yPos + 12)
    } catch (error) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(18)
      doc.text("WINE NAILS SPA", margin, yPos)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(12)
      doc.text("Liquidación de Servicios", margin, yPos + 8)
    }

    // Número
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text(`#${liquidacion.id}`, pageWidth - margin, yPos + 5, { align: "right" })

    yPos += 35

    // Información
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)

    doc.text("Manicurista:", margin, yPos)
    doc.text(liquidacion.manicurista?.nombre || "No disponible", margin + 30, yPos)

    doc.text("Período:", margin, yPos + 8)
    doc.text(`${formatDate(liquidacion.fecha_inicio)} - ${formatDate(liquidacion.fecha_final)}`, margin + 30, yPos + 8)

    doc.text("Servicios:", margin, yPos + 16)
    doc.text((liquidacion.cantidad_servicios_completados || 0).toString(), margin + 30, yPos + 16)

    // Total
    doc.setTextColor(...hexToRgb(STYLES.colors.black))
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("TOTAL:", pageWidth - margin - 50, yPos + 8)
    doc.setFontSize(16)
    doc.setTextColor(...hexToRgb(STYLES.colors.primary))
    doc.text(formatCurrency(liquidacion.total_a_pagar || 0), pageWidth - margin, yPos + 8, { align: "right" })

    yPos += 35

    // Observaciones
    if (liquidacion.observaciones && liquidacion.observaciones.trim()) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(...hexToRgb(STYLES.colors.black))
      doc.text("Observaciones:", margin, yPos)

      doc.setFont("helvetica", "normal")
      const observacionesLineas = doc.splitTextToSize(liquidacion.observaciones, pageWidth - margin * 2)
      doc.text(observacionesLineas, margin, yPos + 8)

      yPos += 20 + observacionesLineas.length * 4
    }

    // Resumen simple
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(...hexToRgb(STYLES.colors.black))
    doc.text("Resumen", margin, yPos)

    yPos += 10

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text("Total Servicios:", margin, yPos)
    doc.text(formatCurrency(liquidacion.total_servicios_completados || 0), margin + 60, yPos)

    doc.text("Bonificación:", margin, yPos + 8)
    doc.text(formatCurrency(liquidacion.bonificacion || 0), margin + 60, yPos + 8)

    const subtotal = (liquidacion.total_servicios_completados || 0) + (liquidacion.bonificacion || 0)
    doc.text("Subtotal (Sin 50%):", margin, yPos + 16)
    doc.text(formatCurrency(subtotal), margin + 60, yPos + 16)

    doc.text("Valor Base (50%):", margin, yPos + 24)
    doc.text(formatCurrency(liquidacion.valor || 0), margin + 60, yPos + 24)

    yPos += 35

    // Total final
    doc.setDrawColor(...hexToRgb(STYLES.colors.lightGray))
    doc.line(margin, yPos, pageWidth - margin, yPos)

    yPos += 8
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("TOTAL A PAGAR:", pageWidth - margin - 50, yPos)
    doc.setTextColor(...hexToRgb(STYLES.colors.primary))
    doc.text(formatCurrency(liquidacion.total_a_pagar || 0), pageWidth - margin, yPos, { align: "right" })

    // Pie de página
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...hexToRgb(STYLES.colors.lightGray))

    const fechaGeneracion = new Date().toLocaleDateString("es-CO")
    doc.text(`Generado: ${fechaGeneracion}`, margin, pageHeight - 10)
    doc.text("Wine Nails Spa", pageWidth - margin, pageHeight - 10, { align: "right" })

    // Guardar
    const manicuristaNombre = liquidacion.manicurista?.nombre || "Manicurista"
    const fechaInicio = formatDate(liquidacion.fecha_inicio).replace(/\//g, "-")
    const nombreArchivo = `Liquidacion_${liquidacion.id}_${manicuristaNombre}_${fechaInicio}.pdf`
    doc.save(nombreArchivo)

    return true
  } catch (error) {
    console.error("Error al generar PDF simple de liquidación:", error)
    alert("Error al generar el PDF de liquidación")
    return false
  }
}
