document.body.classList.add("dark-mode");

const svg = d3.select("svg");
const margin = { top: 20, right: 20, bottom: 30, left: 40 };
const width = +svg.attr("width") - margin.left - margin.right;
const height = +svg.attr("height") - margin.top - margin.bottom;

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

let data = []; // Изначально данные пустые
let initialData = []; // Переменная для сохранения начальных данных
let xScale, yScale; // Объявляем xScale и yScale глобально

function render() {
    if (data.length === 0) return; // Если данных нет, ничего не рендерим

    const xMin = d3.min(data, d => d.x);
    const xMax = d3.max(data, d => d.x) + 10;
    const yMin = d3.min(data, d => d.y);
    const yMax = d3.max(data, d => d.y) + 10;

    xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, width]);
    yScale = d3.scaleLinear().domain([yMin, yMax]).range([height, 0]);

    g.selectAll(".point")
        .data(data)
        .join("circle")
        .attr("class", "point")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 5)
        .attr("fill", (d, i) => document.body.classList.contains("dark-mode") ? "#ccc" : "steelblue");

    g.selectAll(".x-axis").remove();
    g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale));

    g.selectAll(".y-axis").remove();
    g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale));

    g.selectAll(".grid").remove();
    g.append("g")
        .attr("class", "grid")
        .selectAll("line")
        .data(yScale.ticks(10))
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))
        .attr("stroke", document.body.classList.contains("dark-mode") ? "#888" : "#666")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "2,2");

    g.append("g")
        .attr("class", "grid")
        .selectAll("line")
        .data(xScale.ticks(10))
        .enter()
        .append("line")
        .attr("x1", d => xScale(d))
        .attr("x2", d => xScale(d))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", document.body.classList.contains("dark-mode") ? "#888" : "#666")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "2,2");
}

// Загрузка данных из выбранного файла JSON
document.getElementById("fileInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const jsonData = JSON.parse(e.target.result);
            // Преобразуем данные в нужный формат
            data = jsonData.map(d => ({ x: d.X, y: d.Y }));
            initialData = [...data]; // Сохраняем начальные данные
            render(); // Перерисовываем график с новыми данными
        };
        reader.readAsText(file);
    }
});

function resetZoom() {
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity); // Сброс зума
}

d3.select("#reset").on("click", () => {
    if (initialData.length > 0) {
        data = [...initialData]; // Восстанавливаем данные из начальных
        render(); // Перерисовываем график
        resetZoom(); // Сброс зума
    }
});

d3.select("#toggleDarkMode").on("click", () => {
    document.body.classList.toggle("dark-mode");
    svg.style("background-color", document.body.classList.contains("dark-mode") ? "#444" : "#fff");
    render();
});

const zoom = d3.zoom()
    .scaleExtent([0.0001, 50]) // Ограничиваем масштаб от 0.5 до 5
    .on("zoom", (event) => {
        // Обновляем масштабы
        const newXScale = event.transform.rescaleX(xScale);
        const newYScale = event.transform.rescaleY(yScale);

        g.selectAll(".point")
            .attr("cx", d => newXScale(d.x))
            .attr("cy", d => newYScale(d.y)); // Обновляем положение точек

        g.select(".x-axis").call(d3.axisBottom(newXScale)); // Обновляем ось X
        g.select(".y-axis").call(d3.axisLeft(newYScale)); // Обновляем ось Y
    });

svg.call(zoom); // Применяем зум к svg

render(); // Изначально вызываем render с пустыми данными