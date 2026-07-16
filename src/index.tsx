import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, 
  Droplet, 
  Send, 
  Printer, 
  FileText, 
  AlertCircle, 
  Loader2, 
  Calendar, 
  Check, 
  History, 
  Info,
  CalendarDays,
  UserCheck,
  UserMinus,
  RefreshCw
} from 'lucide-react';

const apiKey = ""; // La API key se inyecta de manera segura desde el entorno de ejecución

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Calcula la diferencia de días absolutos para el indicador de procedencia
const getDaysDifference = (dateStr1, dateStr2) => {
  if (!dateStr1 || !dateStr2) return 0;
  const d1 = new Date(dateStr1 + "T00:00:00");
  const d2 = new Date(dateStr2 + "T00:00:00");
  const diffTime = Math.abs(d1 - d2);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Configuración maestra de los 7 supervisores, roles, colores e identificación
const ENCARGADOS = {
  "Willy": { 
    role: "Vigilancia / Porterías", 
    color: "bg-yellow-100 text-yellow-800 border-yellow-300", 
    badgeColor: "bg-yellow-500", 
    bannerColor: "border-l-4 border-yellow-400 bg-yellow-50/50",
    textLight: "text-yellow-700",
    roleKey: "Vigilancia"
  },
  "Luis R": { 
    role: "Parcelas de Campo", 
    color: "bg-emerald-100 text-emerald-800 border-emerald-300", 
    badgeColor: "bg-emerald-500", 
    bannerColor: "border-l-4 border-emerald-400 bg-emerald-50/50",
    textLight: "text-emerald-700",
    roleKey: "Parceleros"
  },
  "Estable": { 
    role: "Personal Estable de Operaciones", 
    color: "bg-purple-100 text-purple-800 border-purple-300", 
    badgeColor: "bg-purple-500", 
    bannerColor: "border-l-4 border-purple-400 bg-purple-50/50",
    textLight: "text-purple-700",
    roleKey: "Estables"
  },
  "Jose": { 
    role: "Infestación", 
    color: "bg-yellow-100 text-yellow-800 border-yellow-200", 
    badgeColor: "bg-yellow-400", 
    bannerColor: "border-l-4 border-yellow-300 bg-yellow-50/30",
    textLight: "text-yellow-700",
    roleKey: "Infestación"
  },
  "Andrea": { 
    role: "Poda", 
    color: "bg-green-100 text-green-800 border-green-200", 
    badgeColor: "bg-green-500", 
    bannerColor: "border-l-4 border-green-300 bg-green-50/30",
    textLight: "text-green-700",
    roleKey: "Poda"
  },
  "Natali": { 
    role: "Plantación", 
    color: "bg-orange-100 text-orange-800 border-orange-200", 
    badgeColor: "bg-orange-500", 
    bannerColor: "border-l-4 border-orange-300 bg-orange-50/30",
    textLight: "text-orange-700",
    roleKey: "Plantación"
  },
  "Paulo": { 
    role: "Riego / ISR", 
    color: "bg-blue-100 text-blue-800 border-blue-200", 
    badgeColor: "bg-blue-500", 
    bannerColor: "border-l-4 border-blue-300 bg-blue-50/30",
    textLight: "text-blue-700",
    roleKey: "Riego"
  }
};

const locations = ["L9", "L3", "MUTO", "ZEGARRA"];

// Unificación de comedores especiales y estandarización automática de dígitos
const normalizePlace = (place) => {
  if (!place) return "";
  let p = place.trim().toUpperCase();
  
  // Regla 1: Unificación de Planta de Fabricación y Llenado a COMEDOR PLANTA
  if (
    p.includes("PLANTA DE SECA") || 
    p.includes("PLANTA DE FABRI") || 
    p.includes("SECADO") || 
    p.includes("FABRICACION") || 
    p.includes("FABRICACIÓN") ||
    p.includes("LLENADO") ||
    p === "PLANTA"
  ) {
    return "COMEDOR PLANTA";
  }

  // Regla 2: Formatear comedores MOVIBLES (X can be single or double digit)
  // Ej: "COMEDOR 3 MOVIBLE" -> "COMEDOR 03 MOVIBLE" | "COMEDOR 10 MOVIBLE" -> "COMEDOR 10 MOVIBLE"
  const matchComedorMovible = p.match(/^COMEDOR\s*(\d+)\s*MOVIBLE$/i);
  if (matchComedorMovible) {
    const num = parseInt(matchComedorMovible[1]);
    return num < 10 ? `COMEDOR 0${num} MOVIBLE` : `COMEDOR ${num} MOVIBLE`;
  }

  // Regla 3: Traducir códigos de M1 a M6 de MUTO que sean MOVIBLES
  // Ej: "M3 MOVIBLE" o "M3 MOVIL" -> "COMEDOR 03 MOVIBLE"
  const matchMMovible = p.match(/^M\s*(\d+)\s*(MOVIBLE|MOVIL)$/i);
  if (matchMMovible) {
    const num = parseInt(matchMMovible[1]);
    if (num >= 1 && num <= 6) {
      return `COMEDOR 0${num} MOVIBLE`;
    }
  }

  // Regla 4: Formatear comedores fijos normales con un dígito a formato COMEDOR 0X
  const matchComedor = p.match(/^COMEDOR\s*(\d+)$/i);
  if (matchComedor) {
    const num = parseInt(matchComedor[1]);
    return num < 10 ? `COMEDOR 0${num}` : `COMEDOR ${num}`;
  }

  // Regla 5: Traducir códigos fijos de M1 a M6 de MUTO a COMEDOR 01 a COMEDOR 06 (Andrea)
  const matchM = p.match(/^M\s*(\d+)$/i);
  if (matchM) {
    const num = parseInt(matchM[1]);
    if (num >= 1 && num <= 6) {
      return `COMEDOR 0${num}`;
    }
  }

  // Reglas generales para estandarizar textos comunes de Agropel
  if (p === "PORTERIA L9" || p === "PORTERIA") return "PORTERIA";
  if (p === "PORTERIA MUTO") return "PORTERIA MUTO";
  if (p === "CABEZAL MUTO") return "CABEZAL MUTO";
  if (p === "CABEZAL RIEGO") return "CABEZAL RIEGO";
  if (p === "TALLER") return "TALLER";
  if (p === "MODULO DE APLICADORES" || p === "APLICADORES") return "MODULO DE APLICADORES";
  if (p === "COMEDOR PARCELERO" || p === "COMEDOR PARCELEROS" || p === "COMEDOR PARCELERO MUTO") return "COMEDOR PARCELEROS";
  if (p === "COMEDOR PARCELEROS L3" || p === "COMEDOR PARCELERO L3") return "COMEDOR PARCELEROS L3";

  return p;
};

// Plantilla maestra para los lunes (excluyendo Fabricación y Llenado de estables)
const LUNES_PLANTILLA = [
  // L9
  { location: "L9", place: "PORTERIA", group: "Vigilancia", peopleCount: 10, extraBidones: 0, supervisor: "Willy" },
  { location: "L9", place: "TALLER", group: "Choferes", peopleCount: 4, extraBidones: 0, supervisor: "Estable" },
  { location: "L9", place: "TALLER", group: "Tractoristas", peopleCount: 4, extraBidones: 0, supervisor: "Estable" },
  { location: "L9", place: "TALLER", group: "Taller", peopleCount: 3, extraBidones: 0, supervisor: "Estable" },
  { location: "L9", place: "MODULO DE APLICADORES", group: "Parceleros", peopleCount: 4, extraBidones: 0, supervisor: "Luis R" },
  { location: "L9", place: "COMEDOR 01", group: "Vivero", peopleCount: 3, extraBidones: 0, supervisor: "Estable" },
  { location: "L9", place: "COMEDOR 01", group: "Servicios", peopleCount: 1, extraBidones: 0, supervisor: "Estable" },
  { location: "L9", place: "CABEZAL RIEGO", group: "Riego L9", peopleCount: 3, extraBidones: 0, supervisor: "Estable" },

  // MUTO
  { location: "MUTO", place: "PORTERIA MUTO", group: "Vigilancia", peopleCount: 4, extraBidones: 0, supervisor: "Willy" },
  { location: "MUTO", place: "COMEDOR PARCELEROS", group: "Parceleros Muto", peopleCount: 11, extraBidones: 0, supervisor: "Luis R" },
  { location: "MUTO", place: "CABEZAL MUTO", group: "Cabezal muto", peopleCount: 4, extraBidones: 0, supervisor: "Estable" },

  // L3
  { location: "L3", place: "PORTERIA", group: "Vigilancia", peopleCount: 2, extraBidones: 0, supervisor: "Willy" },
  { location: "L3", place: "COMEDOR PARCELEROS L3", group: "Parceleros L3", peopleCount: 6, extraBidones: 0, supervisor: "Luis R" },

  // ZEGARRA
  { location: "ZEGARRA", place: "COMEDOR 01", group: "ZEG-Riego", peopleCount: 2, extraBidones: 0, supervisor: "Estable" }
];

// Datos mock del día anterior (Viernes) para arrastre automático inmediato al iniciar
const HISTORICO_MOCK = LUNES_PLANTILLA.map((item, idx) => ({
  id: `mock-${idx}`,
  date: "2026-07-10",
  ...item
}));

export default function App() {
  const [whatsappText, setWhatsappText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [selectedSender, setSelectedSender] = useState("Autodetectar");
  const [showNotification, setShowNotification] = useState(null);
  
  // Estado para la API Key de Gemini guardada de manera persistente en el dispositivo del usuario
  const [geminiKey, setGeminiKey] = useState(() => {
    return localStorage.getItem('agropel_gemini_key') || '';
  });
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Filtros dinámicos de las columnas para los Grupos Activos
  const [filterLocation, setFilterLocation] = useState("Todos");
  const [filterSupervisor, setFilterSupervisor] = useState("Todos");
  const [filterSearch, setFilterSearch] = useState("");

  const [allRecords, setAllRecords] = useState(() => {
    const saved = localStorage.getItem('agropel_water_records_v3');
    return saved ? JSON.parse(saved) : HISTORICO_MOCK;
  });

  const [selectedDate, setSelectedDate] = useState(() => {
    // Inicializa con la fecha actual del sistema
    return new Date().toISOString().split('T')[0];
  });

  const [advanceToWednesday, setAdvanceToWednesday] = useState(() => {
    const saved = localStorage.getItem('agropel_advance_wednesday');
    return saved ? JSON.parse(saved) : false;
  });

  const [offDutyDays, setOffDutyDays] = useState(() => {
    const saved = localStorage.getItem('agropel_off_duty');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('agropel_water_records_v3', JSON.stringify(allRecords));
  }, [allRecords]);

  useEffect(() => {
    localStorage.setItem('agropel_off_duty', JSON.stringify(offDutyDays));
  }, [offDutyDays]);

  useEffect(() => {
    localStorage.setItem('agropel_advance_wednesday', JSON.stringify(advanceToWednesday));
  }, [advanceToWednesday]);

  const getDayOfWeekName = (dateStr) => {
    if (!dateStr) return "";
    const parsedDate = new Date(dateStr + "T00:00:00");
    const options = { weekday: 'long' };
    return parsedDate.toLocaleDateString('es-PE', options);
  };

  const isLunes = useMemo(() => {
    const day = getDayOfWeekName(selectedDate);
    return day.toLowerCase().includes("lunes");
  }, [selectedDate]);

  // Calcula la fecha aproximada de la próxima recarga basada en ciclos de 3 días
  const nextRecargaDate = useMemo(() => {
    const baseDate = new Date(selectedDate + "T00:00:00");
    let daysToAdd = 3; 
    if (advanceToWednesday) {
      daysToAdd = 2; // Adelantar al miércoles
    }
    const targetDate = new Date(baseDate);
    targetDate.setDate(baseDate.getDate() + daysToAdd);
    
    return targetDate.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  }, [selectedDate, advanceToWednesday]);

  // Registros activos hoy: Combina reportes reales del día de hoy y arrastra lo de ayer si algún supervisor no reportó
  const activeRecords = useMemo(() => {
    const todaysManualAndParsed = allRecords.filter(r => r.date === selectedDate);
    const supervisorsWithData = new Set(todaysManualAndParsed.map(r => r.supervisor));
    const finalRecords = [...todaysManualAndParsed];

    Object.keys(ENCARGADOS).forEach(name => {
      if (!supervisorsWithData.has(name)) {
        // Si el encargado fue marcado como "Libre / Sin labores", no se le arrastra nada
        const isOffDutyToday = offDutyDays[selectedDate]?.[name];
        if (isOffDutyToday) {
          return; 
        }

        // Buscar el último registro ingresado por este supervisor en fechas anteriores
        const previousRecords = allRecords
          .filter(r => r.supervisor === name && r.date < selectedDate)
          .sort((a, b) => b.date.localeCompare(a.date)); 

        if (previousRecords.length > 0) {
          const lastDate = previousRecords[0].date;
          const lastDateRecords = previousRecords.filter(r => r.date === lastDate);
          
          lastDateRecords.forEach(r => {
            finalRecords.push({
              ...r,
              id: `fallback-${r.id}`, 
              date: selectedDate, 
              isFallback: true,
              originalDate: lastDate
            });
          });
        }
      }
    });

    return finalRecords;
  }, [allRecords, selectedDate, offDutyDays]);

  // Aplicación de los filtros interactivos sobre las columnas de grupos activos
  const filteredActiveRecords = useMemo(() => {
    return activeRecords.filter(r => {
      const matchesLoc = filterLocation === "Todos" || r.location === filterLocation;
      const matchesSup = filterSupervisor === "Todos" || r.supervisor === filterSupervisor;
      const matchesSearch = filterSearch.trim() === "" || 
        r.place.toLowerCase().includes(filterSearch.toLowerCase()) ||
        r.group.toLowerCase().includes(filterSearch.toLowerCase());
      return matchesLoc && matchesSup && matchesSearch;
    });
  }, [activeRecords, filterLocation, filterSupervisor, filterSearch]);

  // Resumen del estatus de envíos de cada supervisor para la interfaz
  const supervisorsStatus = useMemo(() => {
    const status = {};
    Object.keys(ENCARGADOS).forEach(name => {
      const hasToday = allRecords.some(r => r.date === selectedDate && r.supervisor === name);
      const isOffDuty = offDutyDays[selectedDate]?.[name];

      if (hasToday) {
        status[name] = { type: "TODAY", text: "Registrado Hoy", color: "bg-emerald-500 text-white" };
      } else if (isOffDuty) {
        status[name] = { type: "OFF_DUTY", text: "Sin Labores Hoy", color: "bg-slate-500 text-white" };
      } else {
        const lastRecords = allRecords.filter(r => r.supervisor === name && r.date < selectedDate);
        if (lastRecords.length > 0) {
          const sorted = lastRecords.sort((a, b) => b.date.localeCompare(a.date));
          const lastDate = sorted[0].date;
          const formattedDateStr = new Date(lastDate + "T00:00:00").toLocaleDateString('es-PE', { day: 'numeric', month: 'numeric' });
          status[name] = { type: "FALLBACK", text: `Usando Ayer (${formattedDateStr})`, color: "bg-amber-500 text-white", lastDate };
        } else {
          status[name] = { type: "NONE", text: "Sin historial", color: "bg-rose-500 text-white" };
        }
      }
    });
    return status;
  }, [allRecords, selectedDate, offDutyDays]);

  // Algoritmo de extracción por Inteligencia Artificial para el texto de WhatsApp
  const parseWhatsApp = async () => {
    if (!whatsappText.trim()) return;

    if (!geminiKey.trim()) {
      setErrorText("Por favor, introduce tu API Key de Gemini en el panel de configuración (indicador 'Gemini API' en la cabecera).");
      return;
    }

    setIsParsing(true);
    setErrorText("");

    const promptText = `
      Analiza el siguiente mensaje de WhatsApp enviado en el contexto del fundo Agropel.
      Extrae los requerimientos de agua solicitados.

      MENSAJE DE WHATSAPP:
      "${whatsappText}"

      Remitente seleccionado para este mensaje (si no es Autodetectar, fuerza a que este sea el supervisor): "${selectedSender}"

      REGLAS CRÍTICAS DE CONSOLIDACIÓN Y TRADUCCIÓN:
      1. Campo "place" (Diferenciación estricta de Comedores Movibles):
         - Si menciona que un comedor es "movible", "móvil" o tiene una terminación similar (ej. "Comedor 10 movible", "comedor3 movible", "m3 movible", "m4 movil"), DEBES conservar obligatoriamente el sufijo "MOVIBLE" (ej: "COMEDOR 10 MOVIBLE").
         - De igual forma, si es un comedor estático normal sin la especificación de "movible", nómbralo simplemente "COMEDOR XX" (ej: "COMEDOR 10").
         - Es de VITAL importancia que "COMEDOR X MOVIBLE" y "COMEDOR X" se traten como lugares totalmente distintos e independientes, nunca los fusiones.
         - Si menciona "planta de seca", "planta de fabricacion", "secado", "fabricacion", "llenado" o "fabricación", tradúcelo EXACTAMENTE como "COMEDOR PLANTA".
         - Si menciona "taller", "choferes" o "tractoristas" asociados a un taller, el lugar es "TALLER".
         - Si menciona comedores individuales con números, ej. "comedor 3" o "comedor3", tradúcelo siempre con dos dígitos: "COMEDOR 03". Aplica esto a cualquier comedor de un solo dígito (COMEDOR 01, COMEDOR 02, etc.).
         - REGLA DE CÓDIGOS DE MUTO (M1 a M6): Si se mencionan códigos como "m1", "m2", "m3", "m4", "m5", "m6" (muy común en los mensajes de Andrea de Poda), se refieren a comedores dentro de MUTO. Tradúcelos a "COMEDOR 01", "COMEDOR 02", etc., respectivamente (ej. m1 -> COMEDOR 01, m6 -> COMEDOR 06) y asigna obligatoriamente la ubicación "MUTO". Si traen sufijo móvil, eg. "m3 movible" -> "COMEDOR 03 MOVIBLE" en MUTO.
      2. Campo "supervisor" (Deducción de Encargados según labor u origen):
         - Si el mensaje contiene códigos "m1" a "m6" o menciona expresamente labores de "poda" -> supervisor: "Andrea" (Poda).
         - Si habla de "vigilancia", "portería" o "seguridad" -> supervisor: "Willy" (Vigilancia).
         - Si habla de "parcelas", "parcelero" o "labores de siembra" -> supervisor: "Luis R" (Parceleros).
         - Si habla de "riego", "isr" o "islas" -> supervisor: "Paulo" (Riego).
         - Si habla de "plantacion" o "sembrar" -> supervisor: "Natali" (Plantación).
         - Si habla de "infestación" o "inoculación" -> supervisor: "Jose" (Infestación).
         - Para cualquier otra labor (choferes, tractoristas, taller, vivero, servicios, fabricación, llenado, etc.) -> supervisor: "Estable" (Personal Estable).
         - Si el Remitente Seleccionado no es "Autodetectar", prioriza asignar ese supervisor a todos los registros extraídos del mensaje.
      3. Campo "location":
         - Para cualquier comedor derivado de "m1" a "m6", la ubicación DEBE ser "MUTO".
      4. Campo "extraBidones":
         - Si en el texto se solicitan explícitamente bidones de más o reservas, asigna la cantidad en "extraBidones". Si no, colócalo en 0.
      5. Estructura la respuesta final en un formato JSON estricto.
    `;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      systemInstruction: { 
        parts: [{ 
          text: "Eres el robot de control de agua potable de Agropel. Analizas mensajes informales de WhatsApp de supervisores y los conviertes en JSON de requerimientos de agua sin texto explicativo adicional. Comedor Movible y Comedor Fijo se diferencian estrictamente." 
        }] 
      },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              location: { type: "STRING", enum: ["L9", "L3", "MUTO", "ZEGARRA"] },
              place: { type: "STRING" },
              group: { type: "STRING" },
              peopleCount: { type: "INTEGER" },
              extraBidones: { type: "INTEGER" },
              supervisor: { type: "STRING", enum: ["Willy", "Luis R", "Estable", "Jose", "Andrea", "Natali", "Paulo"] }
            },
            required: ["location", "place", "group", "peopleCount", "extraBidones", "supervisor"]
          }
        }
      }
    };

    let attempt = 0;
    const maxRetries = 3;
    const delays = [1500, 3000, 5000];

    while (attempt < maxRetries) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );

        if (!response.ok) throw new Error("Error de respuesta del servidor de traducción");

        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (textContent) {
          const parsedData = JSON.parse(textContent);
          
          // Mapeamos los datos limpios y formateados
          const mappedWithUUIDAndDate = parsedData.map(item => ({
            id: crypto.randomUUID(),
            date: selectedDate,
            location: item.location,
            place: normalizePlace(item.place),
            group: item.group,
            peopleCount: parseInt(item.peopleCount) || 0,
            extraBidones: parseInt(item.extraBidones) || 0,
            supervisor: item.supervisor
          }));

          // Guardamos reemplazando registros previos del mismo supervisor para hoy si es que ya existían
          setAllRecords(prev => {
            const supervisorsToOverwrite = new Set(mappedWithUUIDAndDate.map(m => m.supervisor));
            const filtered = prev.filter(r => !(r.date === selectedDate && supervisorsToOverwrite.has(r.supervisor)));
            return [...filtered, ...mappedWithUUIDAndDate];
          });

          setWhatsappText("");
          setIsParsing(false);
          setErrorText("");
          
          setShowNotification({
            title: "WhatsApp Procesado",
            message: `Se han decodificado y guardado con éxito ${mappedWithUUIDAndDate.length} solicitudes de reparto para hoy.`
          });
          return;
        } else {
          throw new Error("No se pudo descifrar el mensaje.");
        }
      } catch (err) {
        attempt++;
        if (attempt >= maxRetries) {
          setErrorText("No se pudo descifrar. Selecciona el encargado manualmente.");
          setIsParsing(false);
          break;
        }
        await delay(delays[attempt - 1]);
      }
    }
  };

  const deleteRecord = (id) => {
    if (id.startsWith('fallback-')) {
      setShowNotification({
        title: "Registro Histórico de Respaldo",
        message: "Este registro proviene de un día anterior (arrastre automático). Para no tener este requerimiento hoy, marca al encargado correspondiente como 'Sin labores' en el panel superior, o ingresa un nuevo reporte para él hoy."
      });
      return;
    }
    setAllRecords(prev => prev.filter(r => r.id !== id));
  };

  // Marca un encargado como "Sin labores" o reactiva su arrastre
  const toggleOffDuty = (name) => {
    setOffDutyDays(prev => {
      const todayState = prev[selectedDate] || {};
      const updatedToday = {
        ...todayState,
        [name]: !todayState[name]
      };
      
      // Si se marca como libre, se borran sus envíos locales creados hoy para este día
      if (updatedToday[name]) {
        setAllRecords(records => records.filter(r => !(r.date === selectedDate && r.supervisor === name)));
      }

      return {
        ...prev,
        [selectedDate]: updatedToday
      };
    });
  };

  // Guardar la API Key de forma segura localmente al cambiarla
  const handleSaveKey = (key) => {
    setGeminiKey(key);
    localStorage.setItem('agropel_gemini_key', key);
  };

  // Carga la plantilla oficial del día Lunes
  const loadMondayPlantilla = () => {
    const loaded = LUNES_PLANTILLA.map(item => ({
      id: crypto.randomUUID(),
      date: selectedDate,
      ...item,
      place: normalizePlace(item.place)
    }));

    setAllRecords(prev => {
      const cleanList = prev.filter(r => r.date !== selectedDate);
      return [...cleanList, ...loaded];
    });

    setShowNotification({
      title: "Plantilla de Lunes Cargada",
      message: "Se ha cargado el Despacho Base oficial del día Lunes con el personal de Vigilancia (Willy), Parceleros (Luis R) y Estables."
    });
  };

  // Lógica oficial: 3 Litros por persona. Bidón de 20 Litros.
  const calculateWater = (peopleCount, extraBidones = 0) => {
    const litrosNecesarios = peopleCount * 3;
    const bidonesBase = Math.ceil(litrosNecesarios / 20);
    const bidones = bidonesBase + extraBidones;
    const litrosDisponibles = bidones * 20;
    return { litrosNecesarios, bidones, litrosDisponibles };
  };

  // Consolidación de lugares para la Hoja de Recuento (Orden Natural/Alfanumérico)
  const consolidatedSummary = useMemo(() => {
    const dataByLocation = locations.map(loc => {
      const locRecords = activeRecords.filter(r => r.location === loc);
      
      // Unificamos por lugar limpio (evitamos duplicados)
      const placesMap = {};
      locRecords.forEach(r => {
        const placeKey = normalizePlace(r.place);
        if (!placesMap[placeKey]) {
          placesMap[placeKey] = {
            rawPlace: placeKey,
            totalPeople: 0,
            totalExtra: 0,
            supervisores: new Set()
          };
        }
        placesMap[placeKey].totalPeople += (r.peopleCount || 0);
        placesMap[placeKey].totalExtra += (r.extraBidones || 0);
        if (r.supervisor) {
          placesMap[placeKey].supervisores.add(r.supervisor);
        }
      });

      // Ordenar Alfabética y Numéricamente (Natural Sort)
      const placesList = Object.values(placesMap).map(p => {
        const waterStats = calculateWater(p.totalPeople, p.totalExtra);
        return {
          ...p,
          ...waterStats,
          supervisoresList: Array.from(p.supervisores)
        };
      }).sort((a, b) => {
        // localeCompare con {numeric: true} realiza el orden natural ("Comedor 02" antes de "Comedor 02 Movible" o "Comedor 10")
        return a.rawPlace.localeCompare(b.rawPlace, undefined, { numeric: true, sensitivity: 'base' });
      });

      const totalPeople = placesList.reduce((sum, p) => sum + p.totalPeople, 0);
      const bidones = placesList.reduce((sum, p) => sum + p.bidones, 0);
      const litrosDisponibles = placesList.reduce((sum, p) => sum + p.litrosDisponibles, 0);

      return {
        location: loc,
        places: placesList,
        totalPeople,
        bidones,
        litrosDisponibles
      };
    });

    return dataByLocation;
  }, [activeRecords]);

  const grandTotal = useMemo(() => {
    return consolidatedSummary.reduce((sum, loc) => ({
      totalPeople: sum.totalPeople + loc.totalPeople,
      bidones: sum.bidones + loc.bidones,
      litrosDisponibles: sum.litrosDisponibles + loc.litrosDisponibles
    }), { totalPeople: 0, bidones: 0, litrosDisponibles: 0 });
  }, [consolidatedSummary]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-12">
      
      {/* CABECERA PRINCIPAL */}
      <header className="bg-gradient-to-r from-purple-950 to-indigo-950 text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600/30 p-2 rounded-xl border border-purple-500/20">
              <Droplet className="h-7 w-7 text-purple-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Agropel - Distribución de Agua</h1>
              <p className="text-xs text-purple-300">Coordinación Logística de Agua Potable, Comedores y Frentes de Campo</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* CONFIGURACIÓN DE API KEY DESDE LA INTERFAZ */}
            <div className="relative">
              <button 
                onClick={() => setShowKeyInput(!showKeyInput)}
                className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                  geminiKey ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300' : 'bg-red-950/70 border-red-800 text-red-300'
                }`}
                title="Configurar API Key de Gemini"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${geminiKey ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${geminiKey ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </span>
                <span className="text-xs font-semibold">Gemini API</span>
              </button>

              {showKeyInput && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl z-50 text-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-purple-400">Configuración de Inteligencia de Campo</h4>
                  <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
                    Pega tu clave de API de Google Gemini para procesar mensajes de WhatsApp de forma directa. La clave se almacena de forma segura en la memoria de este navegador y nunca se envía a servidores de terceros.
                  </p>
                  <input 
                    type="password"
                    placeholder="Escribe o pega tu clave aquí (AIzaSy...)"
                    value={geminiKey}
                    onChange={(e) => handleSaveKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none mb-3 text-white font-mono"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                    <a 
                      href="https://aistudio.google.com/" 
                      target="_blank" 
                      rel="noreferrer"
                      className="hover:underline text-purple-400 font-semibold"
                    >
                      Obtener clave gratis aquí ↗
                    </a>
                    <span>Agropel SAC v3.1</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 bg-indigo-900/50 p-2 rounded-xl border border-indigo-800">
              <Calendar className="h-5 w-5 text-indigo-300" />
              <div className="flex flex-col">
                <span className="text-[10px] text-indigo-200 font-medium uppercase">Día de Trabajo</span>
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-white font-semibold text-sm focus:ring-0 cursor-pointer outline-none"
                />
              </div>
              <div className="bg-indigo-900 text-indigo-200 text-xs px-3 py-1 rounded-lg font-bold uppercase shrink-0">
                {getDayOfWeekName(selectedDate)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* Banner Informativo de Lunes */}
        {isLunes && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 p-2 rounded-lg text-purple-700 shrink-0">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold text-purple-900 text-sm">Hoy es Lunes - Día de Despacho Base</h4>
                <p className="text-xs text-purple-700 mt-0.5 font-medium">Puedes cargar la plantilla oficial de comedores, porterías, talleres y cabezales establecida con un solo clic.</p>
              </div>
            </div>
            <button
              onClick={loadMondayPlantilla}
              className="bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
              <RefreshCw className="h-4 w-4" /> Cargar Plantilla Lunes
            </button>
          </div>
        )}

        {/* PANEL DE CONTROL DE ENCARGADOS */}
        <section className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 mb-6 print:hidden">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-5 w-5 text-slate-500" />
            <h3 className="font-bold text-slate-700 text-sm">Panel de Estado de Supervisores</h3>
            <span className="text-[10px] text-slate-400 font-medium italic ml-auto">Haz clic para marcar como "Sin Labores"</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.keys(ENCARGADOS).map(name => {
              const info = ENCARGADOS[name];
              const status = supervisorsStatus[name];
              const isOff = offDutyDays[selectedDate]?.[name];

              return (
                <div 
                  key={name} 
                  className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                    isOff ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-100 shadow-sm hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${info.color}`}>
                          {info.roleKey}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{info.role}</p>
                    </div>

                    <button 
                      onClick={() => toggleOffDuty(name)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isOff 
                          ? 'bg-slate-200 text-slate-500 hover:bg-slate-300' 
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      }`}
                      title={isOff ? "Marcar como ACTIVO" : "Marcar como LIBRE / SIN LABORES hoy"}
                    >
                      {isOff ? <UserMinus className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Estado de Envío:</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${status.color}`}>
                      {status.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* COLUMNA DE ENTRADA Y TABLA DE HOY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          
          {/* COLUMNA IZQUIERDA: Decodificador */}
          <div className="lg:col-span-1">
            
            <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-green-100 p-2 rounded-lg text-green-700">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-700">Decodificador WhatsApp</h2>
                  <p className="text-xs text-slate-400">La IA deduce automáticamente al supervisor de campo</p>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-600 mb-1">¿Quién envió el mensaje? (Opcional)</label>
                <select
                  value={selectedSender}
                  onChange={(e) => setSelectedSender(e.target.value)}
                  className="w-full border-slate-300 border rounded-lg p-2 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Autodetectar">🔍 Autodetectar según labor (Willy, Luis R, Estable, etc)</option>
                  {Object.keys(ENCARGADOS).map(name => (
                    <option key={name} value={name}>{name} ({ENCARGADOS[name].roleKey})</option>
                  ))}
                </select>
              </div>
              
              <textarea
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs min-h-[140px] focus:ring-2 focus:ring-blue-500 focus:outline-none mb-3 resize-y"
                placeholder="Ej: Hola, para Lateral 9 Porteria son 10 personas de vigilancia. Y en Comedor 10 movible somos 12 personas de Andrea..."
                value={whatsappText}
                onChange={(e) => setWhatsappText(e.target.value)}
                disabled={isParsing}
              />

              {errorText && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-md mb-3 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{errorText}</p>
                </div>
              )}

              <button
                onClick={parseWhatsApp}
                disabled={isParsing || !whatsappText.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
              >
                {isParsing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Procesando con IA...</>
                ) : (
                  <>Procesar Mensaje</>
                )}
              </button>
            </div>

          </div>

          {/* COLUMNA DERECHA: Listado Interactivo */}
          <div className="lg:col-span-2">
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Grupos Activos para Hoy</h2>
                  <p className="text-xs text-slate-400">Cuadrillas operativas según mensajes procesados</p>
                </div>
                <span className="text-xs font-semibold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full">
                  {filteredActiveRecords.length} de {activeRecords.length} Grupos
                </span>
              </div>
              
              {/* FILTROS INTERACTIVOS */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Filtrar por Lateral</label>
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Todos">🌍 Todos los Laterales</option>
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Filtrar por Encargado</label>
                  <select
                    value={filterSupervisor}
                    onChange={(e) => setFilterSupervisor(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Todos">👤 Todos los Encargados</option>
                    {Object.keys(ENCARGADOS).map(name => (
                      <option key={name} value={name}>{name} ({ENCARGADOS[name].roleKey})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Buscar Comedor / Grupo</label>
                  <input
                    type="text"
                    placeholder="🔍 Ej: Taller, Vigilancia..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-3">Lateral</th>
                      <th className="p-3">Lugar (Comedor)</th>
                      <th className="p-3">Grupo / Labores</th>
                      <th className="p-3 text-center">N° Personas</th>
                      <th className="p-3">Encargado</th>
                      <th className="p-3 text-center">Procedencia</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredActiveRecords.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-400 italic">
                          No hay registros que coincidan con los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredActiveRecords.map((r) => {
                        const supervisorInfo = ENCARGADOS[r.supervisor];
                        return (
                          <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${r.isFallback ? 'bg-amber-50/20' : ''}`}>
                            <td className="p-3 font-bold text-slate-800">{r.location}</td>
                            <td className="p-3 text-slate-700 font-semibold">{r.place}</td>
                            <td className="p-3 text-slate-500">{r.group}</td>
                            <td className="p-3 text-center font-bold bg-slate-50/50 text-slate-800">{r.peopleCount}</td>
                            <td className="p-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${supervisorInfo?.color}`}>
                                {r.supervisor}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {r.isFallback ? (
                                <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-semibold flex items-center justify-center gap-1" title={`Fecha origen: ${r.originalDate}`}>
                                  <History className="h-3 w-3" /> Arrastre ({getDaysDifference(selectedDate, r.originalDate)} {getDaysDifference(selectedDate, r.originalDate) === 1 ? 'día' : 'días'})
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-semibold flex items-center justify-center gap-1">
                                  <Check className="h-3 w-3" /> Reporte Nuevo
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => deleteRecord(r.id)}
                                className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors"
                                title="Quitar este registro"
                              >
                                <Trash2 className="h-4 w-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

        {/* HOJA DE RECUENTO GENERAL (Área física de impresión) */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6 print:border-none print:shadow-none print:p-0 print:mt-0">
          
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 border-b border-slate-100 pb-5 print:pb-3 print:mb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-purple-600 print:hidden" />
                <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Hoja de Recuento de Agua Potable</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Agropel S.A.C. | Registro del día: <span className="font-bold text-slate-700 capitalize">{getDayOfWeekName(selectedDate)} {new Date(selectedDate + "T00:00:00").toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <label className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 cursor-pointer hover:bg-purple-100 transition-colors">
                <input 
                  type="checkbox"
                  checked={advanceToWednesday}
                  onChange={(e) => setAdvanceToWednesday(e.target.checked)}
                  className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                Adelantar Recarga al Miércoles
              </label>

              <button 
                onClick={() => window.print()}
                className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold text-xs transition-colors shadow-sm"
              >
                <Printer className="h-4 w-4" /> Imprimir Recuento
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6 flex flex-col sm:flex-row justify-between text-xs text-slate-600 gap-3 print:border-slate-300 print:bg-white print:p-2 print:mb-4">
            <span className="flex items-center gap-1.5">
              <Info className="h-4 w-4 text-slate-500 shrink-0" />
              <strong>Ciclo de Recargas de 3 Días:</strong> Próxima entrega programada para el <strong className="text-purple-700 underline print:text-black">{nextRecargaDate}</strong>.
            </span>
            <span className="sm:text-right">
              Capacidad por Bidón: <strong>20 Litros</strong> | Consumo Estimado: <strong>3 Litros/Persona</strong>
            </span>
          </div>

          <table className="w-full text-left text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 print:bg-slate-150">
                <th className="border border-slate-300 p-2.5 font-bold text-slate-700 text-sm">LATERAL / LUGAR (COMEDOR)</th>
                <th className="border border-slate-300 p-2.5 font-bold text-slate-700 text-center text-sm w-36">Personas</th>
                <th className="border border-slate-300 p-2.5 font-bold text-purple-900 text-center text-sm w-44 print:text-slate-800">Bidones (20L) a Enviar</th>
                <th className="border border-slate-300 p-2.5 font-bold text-slate-700 text-center text-sm w-56">Firma de Recibido</th>
              </tr>
            </thead>
            <tbody>
              {consolidatedSummary.map((loc) => (
                <React.Fragment key={loc.location}>
                  {/* Fila separadora del Lateral */}
                  <tr className="bg-slate-200/80 print:bg-slate-200 font-bold">
                    <td colSpan="4" className="border border-slate-300 p-2 text-slate-800 text-sm tracking-wide uppercase">
                      {loc.location}
                    </td>
                  </tr>

                  {loc.places.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="border border-slate-300 p-3 pl-8 text-slate-400 italic">
                        No se ha registrado distribución ni arrastre para hoy.
                      </td>
                    </tr>
                  ) : (
                    loc.places.map((place, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="border border-slate-300 p-2.5 pl-8 font-semibold text-slate-700 text-xs">
                          <span>• {place.rawPlace}</span>
                          <span className="text-[9px] text-slate-400 ml-2 font-normal">
                            ({place.supervisoresList.join(', ')})
                          </span>
                        </td>
                        <td className="border border-slate-300 p-2.5 text-center text-slate-700 font-medium">
                          {place.totalPeople}
                        </td>
                        <td className="border border-slate-300 p-2.5 text-center font-bold text-purple-700 bg-purple-50/30 text-base print:text-black print:bg-white">
                          {place.bidones}
                        </td>
                        <td className="border border-slate-300 p-2.5">
                          {/* Espacio reservado para firmas de despacho en campo */}
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Subtotal por lateral */}
                  {loc.places.length > 0 && (
                    <tr className="bg-slate-50 font-bold">
                      <td className="border border-slate-300 p-2 text-right text-slate-500 uppercase tracking-wider text-[10px]">
                        Subtotal {loc.location}:
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-600">
                        {loc.totalPeople}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-800 bg-slate-100/50">
                        {loc.bidones}
                      </td>
                      <td className="border border-slate-300 p-2"></td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot className="bg-slate-800 text-white font-bold print:bg-black print:text-white">
              <tr>
                <td className="border border-slate-700 p-3 text-right text-xs uppercase tracking-widest">TOTAL GENERAL DE DESPACHO</td>
                <td className="border border-slate-700 p-3 text-center text-sm">{grandTotal.totalPeople}</td>
                <td className="border border-slate-700 p-3 text-center text-lg bg-purple-900/40 print:bg-transparent">{grandTotal.bidones} BIDONES</td>
                <td className="border border-slate-700 p-3"></td>
              </tr>
            </tfoot>
          </table>

          {/* Firmas físicas en la parte inferior */}
          <div className="hidden print:block mt-16 text-xs text-slate-500">
            <div className="flex justify-around mt-10">
              <div className="text-center">
                <div className="border-t border-slate-400 w-48 mx-auto mb-2"></div>
                <p className="font-bold">Coordinador de Distribución</p>
                <p>Logística Agropel</p>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-400 w-48 mx-auto mb-2"></div>
                <p className="font-bold">Despachador Planta de Agua</p>
                <p>Planta de Agua Potable</p>
              </div>
            </div>
          </div>

        </section>

      </div>

      {/* NOTIFICACIÓN PERSONALIZADA (MODAL REEMPLAZO DE ALERT NATIVO) */}
      {showNotification && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 print:hidden animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 transform scale-100 transition-all">
            <div className="flex items-center gap-3 text-purple-600 mb-4">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Info className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{showNotification.title}</h3>
            </div>
            
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {showNotification.message}
            </p>

            <button
              onClick={() => setShowNotification(null)}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm"
            >
              Aceptar / Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
