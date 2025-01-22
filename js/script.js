document.body.classList.add("dark-mode");

const svg = d3.select("svg");
const margin = { top: 20, right: 20, bottom: 30, left: 40 };
const width = +svg.attr("width") - margin.left - margin.right;
const height = +svg.attr("height") - margin.top - margin.bottom;

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

let data = [];
let initialData = [];
let xScale, yScale;

let isDraggingY = false;
let currentZoomTransform = d3.zoomIdentity;
let originalXDomain, originalYDomain;

const colors = 
{
    light: "steelblue",
    dark: "#ccc",

    grid: 
    {
        light: "#666",
        dark: "#888"
    },

    background: 
    {
        light: "#fff",
        dark: "#444"
    }
};

function render(test = false) 
{
    if (data.length === 0) 
        return;

    updateScales();
    drawPoints();
    drawAxes();
    drawGrid();
}

let index = 0;
let testx;
let testy;

function updateScales() 
{
    const xMin = d3.min(data, d => d.x);
    const xMax = d3.max(data, d => d.x) + 10;
    const yMin = d3.min(data, d => d.y);
    const yMax = d3.max(data, d => d.y) + 10;

    xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, width]);
    yScale = d3.scaleLinear().domain([yMin, yMax]).range([height, 0]);
}

function drawPoints() 
{
    g.selectAll(".point")
        .data(data)
        .join("circle")
        .attr("class", "point")
        .attr("cx", d => currentZoomTransform.applyX(xScale(d.x)))
        .attr("cy", d => yScale(d.y))
        .attr("r", 5)
        .attr("fill", document.body.classList.contains("dark-mode") ? colors.dark : colors.light)
        .on("mouseover", (event, d) => 
        {
            const tooltip = d3.select("#tooltip");
            tooltip.style("display", "block")
                .html(`X: ${d.x}, Y: ${d.y}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", (event) => 
        {
            const tooltip = d3.select("#tooltip");
            tooltip.style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => 
        {
            d3.select("#tooltip").style("display", "none");
        });
}

function drawAxes() 
{

    g.selectAll(".x-axis").remove();
    g.selectAll(".y-axis").remove();


    // Создаем ось X
    const xAxis = g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(currentZoomTransform.rescaleX(xScale)))
        .on("dblclick", (event) => {
            //event.preventDefault(); // Предотвращаем стандартное поведение
            //event.stopPropagation(); // Останавливаем распространение события // Предотвращаем стандартное поведение двойного клика
            resetXScale(); // Сбрасываем масштаб по оси X
        });

    // Создаем ось Y
    const yAxis = g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale))
        .call(d3.drag()
            .on("start", () => 
            {
                d3.select(".y-axis").classed("grabbing", true);
            })
            .on("drag", (event) => 
            {
                const dy = event.dy;
                const newDomain = 
                [
                    yScale.domain()[0] + (dy / height) * (yScale.domain()[1] - yScale.domain()[0]),
                    yScale.domain()[1] + (dy / height) * (yScale.domain()[1] - yScale.domain()[0])
                ];
                yScale.domain(newDomain);

                originalYDomain = newDomain;

                drawPoints();
                drawAxes();
                drawGrid();
            })
            .on("end", () => 
            {
                d3.select(".y-axis").classed("grabbing", false);
            })
        )
        .on("dblclick", (event) => {
            //event.preventDefault(); // Предотвращаем стандартное поведение двойного клика
            resetYScale(); // Сбрасываем масштаб по оси Y
        });

    // Установка курсора для осей
    xAxis.on("mouseover", () => 
    {
        xAxis.style("cursor", "grab");
    })
    .on("mouseout", () => 
    {
        xAxis.style("cursor", "default");
    });

    yAxis.on("mouseover", () => 
    {
        yAxis.style("cursor", "grab");
    })
    .on("mouseout", () => 
    {
        yAxis.style("cursor", "default");
    });
}

function resetXScale() {

    let x = 0;
    let y = currentZoomTransform.y;

    console.log(originalYDomain);

    const customTransform = d3.zoomIdentity.translate(x, y);

    console.log(customTransform);

    svg.transition().duration(750).call(zoom.transform, customTransform);

    drawPoints();
    drawAxes();
    drawGrid();
}

function resetYScale() {
    yScale.domain(originalYDomain);
    console.log("y");
    render();
}

function drawGrid() 
{
    g.selectAll(".grid").remove();

    const gridLines = g.append("g").attr("class", "grid");

    gridLines.selectAll("line.y")
        .data(yScale.ticks(10))
        .enter()
        .append("line")
        .attr("class", "y")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))
        .attr("stroke", document.body.classList.contains("dark-mode") ? colors.grid.dark : colors.grid.light)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "2,2");

    gridLines.selectAll("line.x")
        .data(xScale.ticks(10))
        .enter()
        .append("line")
        .attr("class", "x")
        .attr("x1", d => xScale(d))
        .attr("x2", d => xScale(d))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", document.body.classList.contains("dark-mode") ? colors.grid.dark : colors.grid.light)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "2,2");
}

document.getElementById("fileInput").addEventListener("change", (event) => 
{
    const file = event.target.files[0];
    
    if (file) 
    {
        const reader = new FileReader();

        reader.onload = (e) => 
        {
            const jsonData = JSON.parse(e.target.result);
            data = jsonData.map(d => ({ x: d.X, y: d.Y }));
            initialData = [...data];

            // Сохраняем оригинальные домены
            originalXDomain = [d3.min(data, d => d.x), d3.max(data, d => d.x) + 10];
            originalYDomain = [d3.min(data, d => d.y), d3.max(data, d => d.y) + 10];
            
            testx = data;

            render();
        };

        reader.readAsText(file);
    }
});

function resetZoom() 
{
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    console.log(d3.zoomIdentity);
}

d3.select("#reset").on("click", () => 
{
    if (initialData.length > 0) 
    {
        data = [...initialData];

        render();
        resetZoom();
    }
});

d3.select("#toggleDarkMode").on("click", () => 
{
    document.body.classList.toggle("dark-mode");
    svg.style("background-color", document.body.classList.contains("dark-mode") ? colors.background.dark : colors.background.light);
    render();
});

const zoom = d3.zoom()
    .scaleExtent([0.0001, 50])
    .on("zoom", (event) => 
    {
        currentZoomTransform = event.transform;
        const newXScale = currentZoomTransform.rescaleX(xScale);
        g.selectAll(".point").attr("cx", d => newXScale(d.x));
        g.select(".x-axis").call(d3.axisBottom(newXScale));
    });

svg.call(zoom);

svg.on("dblclick.zoom", null);
render();