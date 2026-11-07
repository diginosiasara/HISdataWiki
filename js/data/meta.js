/* Iconos por ficha y visual del héroe */
HIS.icons={"estadistica":"📊","poblacion-muestra":"👥","muestreo":"🎯","variables":"🧬","fases":"🪜","cualitativas":"🏖️","doble-entrada":"🧮","frecuencias":"🔢","intervalos":"📏","colesterol":"🩸","que-grafico":"📈","diagrama-barras":"📊","histograma":"📶","poligono":"📉","curva-acumulativa":"🌄","sectores":"🥧","posicion-central":"⚖️","cuartiles-percentiles":"✂️"};
var COLB=[["183",5],["190",5],["197",6],["204",6],["211",3]];
HIS.hv={"estadistica":["dots"],"poblacion-muestra":["dots"],"muestreo":["dots"],
"frecuencias":["bars",[["veces el 1",3],["veces el 2",4],["veces el 3",3]],"¿Lo ves?","Cuenta cuántas veces se repite cada valor: es el primer paso."],
"cualitativas":["bars",[["Playa",37],["Montaña",34],["Pueblo",17],["Casa",12]],"¿Lo ves?","La barra más alta marca el destino más elegido."],
"diagrama-barras":["bars",[["Playa",37],["Montaña",34],["Pueblo",17],["Casa",12]],"¿Lo ves?","Las barras van separadas: son categorías."],
"colesterol":["bars",COLB,"¿Lo ves?","Cada barra es un intervalo; la altura, su frecuencia."],
"histograma":["bars",COLB,"¿Lo ves?","Las barras se tocan: los intervalos son contiguos."],
"poligono":["bars",COLB,"¿Lo ves?","El polígono une los puntos medios de cada barra."],
"curva-acumulativa":["bars",[["5",5],["10",10],["16",16],["22",22],["25",25]],"¿Lo ves?","Acumula: siempre sube y acaba en n."],
"que-grafico":["bars",[["Barras",4],["Histograma",5],["Polígono",3],["Ojiva",6]],"¿Lo ves?","Cada tipo de dato pide su gráfico."],
"posicion-central":["strip",[["90","mín"],["92","moda"],["99","mediana"],["112","máx"]],"¿Dónde está el centro de mis datos?"],
"cuartiles-percentiles":["strip",[["90","mín"],["93","Q1"],["99","Q2"],["105","Q3"],["112","máx"]],"Cuatro partes con el mismo número de datos."]};
