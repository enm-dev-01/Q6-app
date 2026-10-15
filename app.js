let historialSorteos = [];
const columnasNumeros = ["N1", "N2", "N3", "N4", "N5", "N6"];
let fpInicio, fpFin;

const mapaModalidades = {
    "SORTEO TRADICIONAL": "Tradicional",
    "LA SEGUNDA DEL QUINI": "Segunda",
    "SORTEO REVANCHA": "Revancha",
    "QUINI QUE SIEMPRE SALE": "Siempre Sale"
};

const nombresMeses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Cargar CSV al iniciar la página
document.addEventListener("DOMContentLoaded", () => {
    Papa.parse("datos_recolectados.csv", {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function(results) {
            historialSorteos = results.data.filter(row => row.Sorteo && row.Fecha);
            
            // Convertir fechas y ordenar descendente
            historialSorteos.forEach(row => {
                const partes = row.Fecha.split('/');
                if (partes.length === 3) {
                    row.Fecha_dt = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
                }
            });
            historialSorteos.sort((a, b) => b.Sorteo - a.Sorteo);

            inicializarFiltrosFechas();
            poblarCheckboxAnos();
            poblarSelectNumeroInicial();
            inicializarMesPorDefecto();
            actualizarDashboard();
        }
    });

    document.getElementById("select-tamanio").addEventListener("change", renderizarCombinaciones);
    document.getElementById("select-modalidad").addEventListener("change", renderizarCombinaciones);
    document.getElementById("input-busqueda").addEventListener("input", renderizarCombinaciones);
    
    document.getElementById("select-numero-inicial").addEventListener("change", renderizarEmpiezaCon);
    document.getElementById("select-modalidad-empieza").addEventListener("change", renderizarEmpiezaCon);
    document.getElementById("input-busqueda-empieza").addEventListener("input", renderizarEmpiezaCon);

    document.getElementById("select-mes-fijo").addEventListener("change", actualizarDashboard);
});

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggleIcon = document.getElementById("toggle-icon");
    
    sidebar.classList.toggle("collapsed");
    
    if (sidebar.classList.contains("collapsed")) {
        toggleIcon.innerText = "»"; 
    } else {
        toggleIcon.innerText = "«"; 
    }
}

function toggleModoFiltro() {
    const esModoComparacion = document.getElementById("modo-comparacion-toggle").checked;
    const secRango = document.getElementById("controles-rango");
    const secMultianual = document.getElementById("controles-multianual");

    if (esModoComparacion) {
        secRango.classList.remove("active");
        secMultianual.classList.add("active");
    } else {
        secMultianual.classList.remove("active");
        secRango.classList.add("active");
    }
    actualizarDashboard();
}

function poblarCheckboxAnos() {
    const anosSet = new Set();
    historialSorteos.forEach(row => {
        if (!isNaN(row.Fecha_dt)) {
            anosSet.add(row.Fecha_dt.getFullYear());
        }
    });

    const anosOrdenados = Array.from(anosSet).sort((a, b) => b - a);
    const contenedor = document.getElementById("contenedor-anos-checkboxes");
    contenedor.innerHTML = "";

    anosOrdenados.forEach((ano, index) => {
        const label = document.createElement("label");
        label.className = "ano-checkbox-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = ano;
        if (index === 0) checkbox.checked = true;

        checkbox.addEventListener("change", actualizarDashboard);

        const span = document.createElement("span");
        span.textContent = ano;

        label.appendChild(checkbox);
        label.appendChild(span);
        contenedor.appendChild(label);
    });
}

function poblarSelectNumeroInicial() {
    const select = document.getElementById("select-numero-inicial");
    select.innerHTML = '<option value="">-- Todos (Ordenados por número y fecha) --</option>';
    
    for (let i = 0; i <= 45; i++) {
        let numStr = String(i).padStart(2, '0');
        const opt = document.createElement("option");
        opt.value = numStr;
        opt.textContent = numStr;
        select.appendChild(opt);
    }
}

function inicializarMesPorDefecto() {
    if (historialSorteos.length === 0) return;
    const ultimaFecha = historialSorteos[0].Fecha_dt;
    if (!isNaN(ultimaFecha)) {
        const mesActual = ultimaFecha.getMonth() + 1;
        document.getElementById("select-mes-fijo").value = mesActual;
    }
}

function inicializarFiltrosFechas() {
    if (historialSorteos.length === 0) return;

    const fechas = historialSorteos.map(d => d.Fecha_dt).filter(d => !isNaN(d));
    const minDate = new Date(Math.min(...fechas)).toISOString().split('T')[0];
    const maxDate = new Date(Math.max(...fechas)).toISOString().split('T')[0];

    const ultimaFecha = historialSorteos[0].Fecha_dt;
    let inicioDefaultStr;
    
    if (!isNaN(ultimaFecha)) {
        const y = ultimaFecha.getFullYear();
        const m = String(ultimaFecha.getMonth() + 1).padStart(2, '0');
        inicioDefaultStr = `${y}-${m}-01`;
    } else {
        const dMax = new Date(maxDate);
        dMax.setDate(1);
        inicioDefaultStr = dMax.toISOString().split('T')[0];
    }

    const configFlatpickr = {
        locale: "es",
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d/m/Y",
        minDate: minDate,
        maxDate: maxDate,
        disableMobile: true,
        onChange: function() {
            actualizarDashboard();
        }
    };

    fpInicio = flatpickr("#fecha-inicio", {
        ...configFlatpickr,
        defaultDate: inicioDefaultStr >= minDate ? inicioDefaultStr : minDate
    });

    fpFin = flatpickr("#fecha-fin", {
        ...configFlatpickr,
        defaultDate: maxDate
    });
}

function filtrarDatos() {
    const esModoComparacion = document.getElementById("modo-comparacion-toggle").checked;

    if (esModoComparacion) {
        const mesSeleccionado = parseInt(document.getElementById("select-mes-fijo").value, 10);
        const checkboxesAnos = document.querySelectorAll("#contenedor-anos-checkboxes input[type='checkbox']:checked");
        const anosSeleccionados = Array.from(checkboxesAnos).map(cb => parseInt(cb.value, 10));

        if (anosSeleccionados.length === 0) return [];

        return historialSorteos.filter(row => {
            if (isNaN(row.Fecha_dt)) return false;
            const m = row.Fecha_dt.getMonth() + 1;
            const y = row.Fecha_dt.getFullYear();
            return m === mesSeleccionado && anosSeleccionados.includes(y);
        });

    } else {
        const inicioStr = document.getElementById("fecha-inicio").value;
        const finStr = document.getElementById("fecha-fin").value;

        if (!inicioStr || !finStr) return historialSorteos;

        const dInicio = new Date(inicioStr);
        const dFin = new Date(finStr);
        dFin.setHours(23, 59, 59);

        return historialSorteos.filter(row => {
            return row.Fecha_dt >= dInicio && row.Fecha_dt <= dFin;
        });
    }
}

function actualizarDashboard() {
    const datosFiltrados = filtrarDatos();
    const esModoComparacion = document.getElementById("modo-comparacion-toggle").checked;
    
    if (esModoComparacion) {
        const mesIndex = parseInt(document.getElementById("select-mes-fijo").value, 10) - 1;
        const nombreMes = nombresMeses[mesIndex];
        
        const checkboxesAnos = document.querySelectorAll("#contenedor-anos-checkboxes input[type='checkbox']:checked");
        const anosSeleccionados = Array.from(checkboxesAnos).map(cb => cb.value).join(", ");
        
        const textoTitulo = `${nombreMes} (${anosSeleccionados || 'Ninguno'})`;
        document.getElementById("titulo-frecuencias").innerText = `Frecuencias de las Bolillas en comparación: ${textoTitulo}`;
        document.getElementById("titulo-combinaciones").innerText = `Combinaciones más frecuentes en comparación: ${textoTitulo}`;
        document.getElementById("titulo-empieza-con").innerText = `Sorteos que empiezan con un determinado número en comparación: ${textoTitulo}`;
    } else {
        const inicioStr = document.getElementById("fecha-inicio").value;
        const finStr = document.getElementById("fecha-fin").value;
        if (inicioStr && finStr) {
            const [y1, m1, d1] = inicioStr.split('-');
            const [y2, m2, d2] = finStr.split('-');
            document.getElementById("titulo-frecuencias").innerText = `Frecuencias de las Bolillas en el intervalo: ${d1}/${m1}/${y1} al ${d2}/${m2}/${y2}`;
            document.getElementById("titulo-combinaciones").innerText = `Combinaciones más frecuentes en el intervalo: ${d1}/${m1}/${y1} al ${d2}/${m2}/${y2}`;
            document.getElementById("titulo-empieza-con").innerText = `Sorteos que empiezan con un determinado número en el intervalo: ${d1}/${m1}/${y1} al ${d2}/${m2}/${y2}`;
        }
    }

    const sorteosUnicosTotal = new Set(historialSorteos.map(d => d.Sorteo)).size;
    const sorteosUnicosSub = new Set(datosFiltrados.map(d => d.Sorteo)).size;
    document.getElementById("metric-sorteos").innerText = `${sorteosUnicosSub} / ${sorteosUnicosTotal}`;

    renderizarFrecuenciasTablas(datosFiltrados);
    renderizarCombinaciones();
    renderizarEmpiezaCon();
}

// -------------------------------------------------------------
// PESTAÑA 1: CÁLCULO Y RENDER DE FRECUENCIAS
// -------------------------------------------------------------
function obtenerRanking(datosOrigen, porSorteoUnico = false, modalidadFiltro = null) {
    let datos = datosOrigen;
    if (modalidadFiltro) {
        datos = datosOrigen.filter(d => d.Modalidad === modalidadFiltro);
    }

    let conteo = {};
    for (let i = 0; i <= 45; i++) conteo[i] = 0;

    if (porSorteoUnico) {
        const sorteosMap = {};
        for (let i = 0; i <= 45; i++) sorteosMap[i] = new Set();

        datos.forEach(row => {
            columnasNumeros.forEach(col => {
                let num = row[col];
                if (num !== undefined && num !== null) {
                    sorteosMap[num].add(row.Sorteo);
                }
            });
        });
        for (let i = 0; i <= 45; i++) {
            conteo[i] = sorteosMap[i].size;
        }
    } else {
        datos.forEach(row => {
            columnasNumeros.forEach(col => {
                let num = row[col];
                if (num !== undefined && num !== null) {
                    conteo[num] = (conteo[num] || 0) + 1;
                }
            });
        });
    }

    let resultado = Object.keys(conteo).map(num => ({
        numero: parseInt(num),
        repeticiones: conteo[num]
    }));

    resultado.sort((a, b) => {
        if (b.repeticiones !== a.repeticiones) {
            return b.repeticiones - a.repeticiones;
        }
        return a.numero - b.numero;
    });

    return resultado;
}

function llenarTablaFrecuencia(tablaId, rankingData, colorBase) {
    const tbody = document.querySelector(`#${tablaId} tbody`);
    tbody.innerHTML = "";

    const maxVal = Math.max(...rankingData.map(r => r.repeticiones), 1);

    rankingData.forEach(item => {
        let intensidad = 0.2 + (0.8 * (item.repeticiones / maxVal));
        if (item.repeticiones === 0) intensidad = 0.05;

        const tr = document.createElement("tr");
        tr.style.backgroundColor = `rgba(${colorBase}, ${intensidad})`;
        tr.innerHTML = `<td>${String(item.numero).padStart(2, '0')}</td><td>${item.repeticiones}</td>`;
        tbody.appendChild(tr);
    });
}

function renderizarFrecuenciasTablas(datosFiltrados) {
    llenarTablaFrecuencia("tabla-total", obtenerRanking(datosFiltrados, false), "249, 115, 22");
    llenarTablaFrecuencia("tabla-sorteo", obtenerRanking(datosFiltrados, true), "37, 99, 235");
    llenarTablaFrecuencia("tabla-trad", obtenerRanking(datosFiltrados, false, "SORTEO TRADICIONAL"), "147, 51, 234");
    llenarTablaFrecuencia("tabla-seg", obtenerRanking(datosFiltrados, false, "LA SEGUNDA DEL QUINI"), "217, 119, 6");
    llenarTablaFrecuencia("tabla-rev", obtenerRanking(datosFiltrados, false, "SORTEO REVANCHA"), "202, 138, 4");
    llenarTablaFrecuencia("tabla-ss", obtenerRanking(datosFiltrados, false, "QUINI QUE SIEMPRE SALE"), "22, 163, 74");
}

// -------------------------------------------------------------
// PESTAÑA 2: CÁLCULO Y RENDER DE COMBINACIONES
// -------------------------------------------------------------
function combinar(arr, k) {
    let subarr, ret = [];
    let fork = i => {
        for (let j = i; j < arr.length; j++) {
            subarr = subarr.concat([arr[j]]);
            if (subarr.length === k) {
                ret.push([...subarr]);
            } else {
                fork(j + 1);
            }
            subarr.pop();
        }
    };
    if (k > 0 && k <= arr.length) {
        subarr = [];
        fork(0);
    }
    return ret;
}

function renderizarCombinaciones() {
    const datosFiltrados = filtrarDatos();
    const tamanio = parseInt(document.getElementById("select-tamanio").value);
    const modalidad = document.getElementById("select-modalidad").value;
    const textoBusqueda = document.getElementById("input-busqueda").value.trim();

    let datosComb = modalidad === "Todas" ? datosFiltrados : datosFiltrados.filter(d => d.Modalidad === modalidad);

    let contadorCombs = {};
    let mappingDetalles = {};

    datosComb.forEach(row => {
        let bolillas = columnasNumeros.map(col => row[col]).filter(n => n !== null && n !== undefined);
        bolillas.sort((a, b) => a - b);

        if (bolillas.length >= tamanio) {
            let modLimpia = mapaModalidades[row.Modalidad] || row.Modalidad;
            let jugadaCompleta = bolillas.map(n => String(n).padStart(2, '0')).join(" - ");
            let detalleStr = `[#${row.Sorteo}], [${row.Fecha}], [${modLimpia}], [${jugadaCompleta}]`;

            if (tamanio === 6) {
                let combKey = bolillas.map(n => String(n).padStart(2, '0')).join(" - ");
                contadorCombs[combKey] = (contadorCombs[combKey] || 0) + 1;
                if (!mappingDetalles[combKey]) mappingDetalles[combKey] = [];
                mappingDetalles[combKey].push(detalleStr);
            } else {
                let tuplas = combinar(bolillas, tamanio);
                tuplas.forEach(tupla => {
                    let combKey = tupla.map(n => String(n).padStart(2, '0')).join(" - ");
                    contadorCombs[combKey] = (contadorCombs[combKey] || 0) + 1;
                    if (!mappingDetalles[combKey]) mappingDetalles[combKey] = [];
                    mappingDetalles[combKey].push(detalleStr);
                });
            }
        }
    });

    let numerosBuscados = [];
    if (textoBusqueda) {
        let tokens = textoBusqueda.match(/\d+/g);
        if (tokens) {
            numerosBuscados = tokens.map(t => t.padStart(2, '0'));
        }
    }

    let resultados = [];
    for (let comb in contadorCombs) {
        if (numerosBuscados.length > 0) {
            let partesComb = comb.split(" - ");
            let cumple = numerosBuscados.every(num => partesComb.includes(num));
            if (!cumple) continue;
        }
        resultados.push({
            combinacion: comb,
            repeticiones: contadorCombs[comb],
            detalles: mappingDetalles[comb].join("\n")
        });
    }

    resultados.sort((a, b) => {
        if (b.repeticiones !== a.repeticiones) return b.repeticiones - a.repeticiones;
        return a.combinacion.localeCompare(b.combinacion);
    });

    const elementoTopComb = document.getElementById("metric-top-comb");
    if (resultados.length > 0) {
        const top = resultados[0];
        elementoTopComb.innerText = `${top.combinacion} (${top.repeticiones} ${top.repeticiones === 1 ? 'vez' : 'veces'})`;
    } else {
        elementoTopComb.innerText = "Sin registros para este criterio";
    }

    document.getElementById("total-combs-text").innerText = `${resultados.length} combinaciones únicas encontradas`;

    const tbody = document.querySelector("#tabla-combinaciones tbody");
    tbody.innerHTML = "";

    resultados.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.style.backgroundColor = index % 2 === 0 ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.06)";
        
        tr.innerHTML = `
            <td>${item.combinacion}</td>
            <td><strong>${item.repeticiones}</strong></td>
            <td style="white-space: pre-line; font-size: 0.8rem;">${item.detalles}</td>
        `;
        tbody.appendChild(tr);
    });
}

// -------------------------------------------------------------
// PESTAÑA 3: EMPIEZA CON
// -------------------------------------------------------------
function renderizarEmpiezaCon() {
    const datosFiltrados = filtrarDatos();
    const numeroSeleccionado = document.getElementById("select-numero-inicial").value;
    const modalidad = document.getElementById("select-modalidad-empieza").value;
    const textoBusqueda = document.getElementById("input-busqueda-empieza").value.trim();

    let datosJugadas = modalidad === "Todas" ? datosFiltrados : datosFiltrados.filter(d => d.Modalidad === modalidad);

    let listaJugadas = [];

    datosJugadas.forEach(row => {
        let bolillas = columnasNumeros.map(col => row[col]).filter(n => n !== null && n !== undefined);
        bolillas.sort((a, b) => a - b);

        if (bolillas.length > 0) {
            let primerBolilla = String(bolillas[0]).padStart(2, '0');
            let modLimpia = mapaModalidades[row.Modalidad] || row.Modalidad;
            let jugadaCompleta = bolillas.map(n => String(n).padStart(2, '0')).join(" - ");

            listaJugadas.push({
                numeroInicial: primerBolilla,
                sorteo: row.Sorteo,
                fechaStr: row.Fecha,
                fechaDt: row.Fecha_dt,
                modalidad: modLimpia,
                jugada: jugadaCompleta,
                bolillasArray: bolillas.map(n => String(n).padStart(2, '0'))
            });
        }
    });

    // 1. Filtrar por número inicial si está seleccionado
    if (numeroSeleccionado !== "") {
        const numFiltro = parseInt(numeroSeleccionado, 10);
        listaJugadas = listaJugadas.filter(j => parseInt(j.numeroInicial, 10) === numFiltro);
    }

    // 2. Filtrar por búsqueda de combinación si se ingresó texto
    if (textoBusqueda) {
        let tokens = textoBusqueda.match(/\d+/g);
        if (tokens) {
            let numerosBuscados = tokens.map(t => t.padStart(2, '0'));
            listaJugadas = listaJugadas.filter(j => {
                return numerosBuscados.every(num => j.bolillasArray.includes(num));
            });
        }
    }

    // --- CÁLCULO DE LOS NÚMEROS ACOMPAÑANTES MÁS FRECUENTES ---
    let conteoAcompañantes = {};
    listaJugadas.forEach(j => {
        let bolillasRestantes = j.bolillasArray.slice(1);
        bolillasRestantes.forEach(num => {
            conteoAcompañantes[num] = (conteoAcompañantes[num] || 0) + 1;
        });
    });

    let acompañantesOrdenados = Object.keys(conteoAcompañantes).map(num => ({
        numero: num,
        veces: conteoAcompañantes[num]
    })).sort((a, b) => b.veces - a.veces);

    const elementoTopEmpieza = document.getElementById("metric-top-empieza");
    if (acompañantesOrdenados.length > 0) {
        let top5 = acompañantesOrdenados.slice(0, 5).map(item => `${item.numero} (${item.veces}v)`).join(", ");
        elementoTopEmpieza.innerText = top5;
    } else {
        elementoTopEmpieza.innerText = "Sin registros para este criterio";
    }
    // ------------------------------------------------------------------------

    // 3. Ordenamiento según selección de número inicial
    if (numeroSeleccionado !== "") {
        listaJugadas.sort((a, b) => b.fechaDt - a.fechaDt);
    } else {
        listaJugadas.sort((a, b) => {
            if (a.numeroInicial !== b.numeroInicial) {
                return a.numeroInicial.localeCompare(b.numeroInicial);
            }
            return b.fechaDt - a.fechaDt;
        });
    }

    document.getElementById("total-empieza-text").innerText = `${listaJugadas.length} jugadas encontradas`;

    const tbody = document.querySelector("#tabla-empieza-con tbody");
    tbody.innerHTML = "";

    listaJugadas.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.style.backgroundColor = index % 2 === 0 ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.06)";
        
        tr.innerHTML = `
            <td><strong>${item.numeroInicial}</strong></td>
            <td>${item.jugada}</td>
            <td>${item.fechaStr}</td>
            <td>#${item.sorteo}</td>
            <td>${item.modalidad}</td>
        `;
        tbody.appendChild(tr);
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (tabName === 'frecuencias') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('tab-frecuencias').classList.add('active');
    } else if (tabName === 'combinaciones') {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('tab-combinaciones').classList.add('active');
    } else if (tabName === 'empieza-con') {
        document.querySelectorAll('.tab-btn')[2].classList.add('active');
        document.getElementById('tab-empieza-con').classList.add('active');
        renderizarEmpiezaCon();
    }
}