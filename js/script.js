document.body.classList.add("dark-mode");

const svg = d3.select("svg");
const margin = { top: 20, right: 20, bottom: 30, left: 40 };
const width = +svg.attr("width") - margin.left - margin.right;
const height = +svg.attr("height") - margin.top - margin.bottom;

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

let data = [];
let initialData = [];
let newPointsCalculations = [];
let xScale, yScale;

let isDraggingY = false;
let currentZoomTransform = d3.zoomIdentity;
let originalXDomain, originalYDomain;
let clickCount = 0;

const rulerButton = document.getElementById('ruler');
const protractorButton = document.getElementById('protractor');

let isRuler = false;
let isProtractor = false;

const colors = {

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

function render(test = false) {
    if (data.length === 0) 
        return;

    updateScales();
    drawPoints();
    drawAxes();
    drawGrid();
}

function updateScales() {
    const xMin = d3.min(data, d => d.x);
    const xMax = d3.max(data, d => d.x);
    const yMin = d3.min(data, d => d.y);
    const yMax = d3.max(data, d => d.y);

    xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, width]);
    yScale = d3.scaleLinear().domain([yMin, yMax]).range([height, 0]);
}

function drawPoints() {
    g.selectAll(".point")
        .data(data)
        .join("circle")
        .attr("class", "point")
        .attr("cx", d => currentZoomTransform.applyX(xScale(d.x)))
        .attr("cy", d => yScale(d.y))
        .attr("r", 5)
        .attr("fill", document.body.classList.contains("dark-mode") ? colors.dark : colors.light)
        .on("mouseover", (event, d) => {
            const tooltip = d3.select("#tooltip");
            tooltip.style("display", "block")
                .html(`X: ${d.x}, Y: ${d.y}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", (event) => {
            const tooltip = d3.select("#tooltip");
            tooltip.style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
            d3.select("#tooltip").style("display", "none");
        });

    if (newPointsCalculations.length === 2 && isRuler) {
        const [p1, p2] = newPointsCalculations;
        const x1 = currentZoomTransform.applyX(xScale(p1.x));
        const y1 = yScale(p1.y);
        const x2 = currentZoomTransform.applyX(xScale(p2.x));
        const y2 = yScale(p2.y);

        g.selectAll(".line").remove();
        g.append("line")
            .attr("class", "line")
            .attr("x1", x1)
            .attr("y1", y1)
            .attr("x2", x2)
            .attr("y2", y2)
            .attr("stroke", "red")
            .attr("stroke-width", 2);

        const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        
        g.selectAll(".distance-label").remove();
        g.append("text")
            .attr("class", "distance-label")
            .attr("x", (x1 + x2) / 2)
            .attr("y", (y1 + y2) / 2 - 10)
            .attr("fill", "red")
            .attr("text-anchor", "middle")
            .text(`Distance: ${distance.toFixed(2)}`);

        g.selectAll(".end-point").remove();
        g.append("circle")
            .attr("class", "end-point")
            .attr("cx", x1)
            .attr("cy", y1)
            .attr("r", 8)
            .attr("fill", "red");

        g.append("circle")
            .attr("class", "end-point")
            .attr("cx", x2)
            .attr("cy", y2)
            .attr("r", 8)
            .attr("fill", "red");
    }

    if (newPointsCalculations.length === 3 && isProtractor) {
        const [p1, p2, p3] = newPointsCalculations;
        const x1 = currentZoomTransform.applyX(xScale(p1.x));
        const y1 = yScale(p1.y);
        const x2 = currentZoomTransform.applyX(xScale(p2.x));
        const y2 = yScale(p2.y);
        const x3 = currentZoomTransform.applyX(xScale(p3.x));
        const y3 = yScale(p3.y);

        g.append("line")
            .attr("class", "line")
            .attr("x1", x1)
            .attr("y1", y1)
            .attr("x2", x2)
            .attr("y2", y2)
            .attr("stroke", "blue")
            .attr("stroke-width", 2);

        g.append("line")
            .attr("class", "line")
            .attr("x1", x2)
            .attr("y1", y2)
            .attr("x2", x3)
            .attr("y2", y3)
            .attr("stroke", "blue")
            .attr("stroke-width", 2);

        const angle = calculateAngle(p1, p2, p3);
        
        g.selectAll(".angle-label").remove();
        const anglePositionX = (x2 + (x2 - x1) / 2);
        const anglePositionY = (y2 + (y3 - y2) / 2);
        g.append("text")
            .attr("class", "angle-label")
            .attr("x", anglePositionX)
            .attr("y", anglePositionY - 10)
            .attr("fill", "blue")
            .attr("text-anchor", "middle")
            .text(`Angle: ${angle.toFixed(2)}°`);
        
        g.append("circle")
            .attr("class", "end-point")
            .attr("cx", x1)
            .attr("cy", y1)
            .attr("r", 8)
            .attr("fill", "blue");

        g.append("circle")
            .attr("class", "end-point")
            .attr("cx", x2)
            .attr("cy", y2)
            .attr("r", 8)
            .attr("fill", "blue");

        g.append("circle")
            .attr("class", "end-point")
            .attr("cx", x3)
            .attr("cy", y3)
            .attr("r", 8)
            .attr("fill", "blue");
    }
}

function drawAxes() 
{

    g.selectAll(".x-axis").remove();
    g.selectAll(".y-axis").remove();

    const xAxis = g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(currentZoomTransform.rescaleX(xScale)))
        .on("dblclick", (event) => {
            resetXScale();
    })
    .on("mousedown", (event) => {
        if (event.button === 2) {
            event.preventDefault();
            d3.select(".x-axis").classed("grabbing", true);
    
            previousXDomain = xScale.domain();
            initialX = d3.pointer(event)[0];
    
            d3.select("body").on("mousemove.drag", (event) => {
                const dx = d3.pointer(event)[0] - initialX;
    
                const scaleFactor = 0.5;
    
                const newDomain = [
                    previousXDomain[0] - dx * scaleFactor,
                    previousXDomain[1] + dx * scaleFactor
                ];
    
                console.log("New X Domain:", newDomain);
    
                xScale.domain(newDomain);

                originalXDomain = newDomain
    
                drawPoints();
                drawAxes();
                drawGrid();
            });
    
            d3.select("body").on("mouseup.drag", () => {
                d3.select(".x-axis").classed("grabbing", false);
                d3.select("body").on("mousemove.drag", null);
                d3.select("body").on("mouseup.drag", null);
            });
        }
    });
    const yAxis = g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale))
        .on("mousedown", (event) => {
            if (event.button === 2) {
                event.preventDefault();
                d3.select(".y-axis").classed("grabbing", true);
        
                const previousYDomain = yScale.domain();
                const initialY = d3.pointer(event)[1];
        
                d3.select("body").on("mousemove.drag", (event) => {
                    const dy = d3.pointer(event)[1] - initialY;
        
                    const range = previousYDomain[1] - previousYDomain[0];
                    const scaleFactor = 0.1;
        
                    const newDomain = [
                        previousYDomain[0] - dy * scaleFactor,
                        previousYDomain[1] + dy * scaleFactor
                    ];
        
                    yScale.domain(newDomain);

                    originalYDomain = newDomain;
        
                    drawPoints();
                    drawAxes();
                    drawGrid();
                });
        
                d3.select("body").on("mouseup.drag", () => {
                    d3.select(".y-axis").classed("grabbing", false);
                    d3.select("body").on("mousemove.drag", null);
                    d3.select("body").on("mouseup.drag", null);
                });
            }
        })
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
            resetYScale();
        });

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

const zoom = d3.zoom()
    .scaleExtent([0.0001, 50])
    .on("zoom", (event) => {
        currentZoomTransform = event.transform;
        const newXScale = currentZoomTransform.rescaleX(xScale);
        g.selectAll(".point").attr("cx", d => newXScale(d.x));
        g.select(".x-axis").call(d3.axisBottom(newXScale));
    });

document.getElementById("fileInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    
    if (file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const jsonData = JSON.parse(e.target.result);
            data = jsonData.map(d => ({ x: d.X, y: d.Y }));
            initialData = [...data];

            originalXDomain = [d3.min(data, d => d.x), d3.max(data, d => d.x) + 10];
            originalYDomain = [d3.min(data, d => d.y), d3.max(data, d => d.y) + 10];

            render();
        };

        reader.readAsText(file);
    }
});

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

function resetZoom() {
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    console.log(d3.zoomIdentity);
}

d3.select("#reset").on("click", () => {
    if (initialData.length > 0) {
        data = [...initialData];

        render();
        resetZoom();
    }
});

function clearGraph() {
    g.selectAll(".angle-label").remove();
    g.selectAll(".end-point").remove();
    g.selectAll("circle").remove();
    g.selectAll(".line").remove();
    g.selectAll(".distance-label").remove();
}

svg.on("click", (event) => {
    if (isRuler) {

        const [x, y] = d3.pointer(event, svg.node());
        const transformedX = currentZoomTransform.invertX(x);
        const transformedY = currentZoomTransform.invertY(y);
        const xValue = xScale.invert(transformedX);
        const yValue = yScale.invert(transformedY);
        const newPoint = { x: xValue, y: yValue };

        clickCount++;

        if (clickCount === 3) {
            newPointsCalculations = [];
            clickCount = 0;
            clearGraph();
        } else {
            newPointsCalculations.push(newPoint);
        }

        render();
    }

    if (isProtractor) {
        const [x, y] = d3.pointer(event, svg.node());
        const transformedX = currentZoomTransform.invertX(x);
        const transformedY = currentZoomTransform.invertY(y);
        const xValue = xScale.invert(transformedX);
        const yValue = yScale.invert(transformedY);
        const newPoint = { x: xValue, y: yValue };

        clickCount++;

        if (clickCount === 1 || clickCount === 2) {
            newPointsCalculations.push(newPoint);
        } else if (clickCount === 3) {
            newPointsCalculations.push(newPoint);
        } else if (clickCount === 4) {
            newPointsCalculations = [];
            clickCount = 0;
            clearGraph();
        }

        render();
    }
});

function calculateAngle(p1, p2, p3) {
    const a = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    const b = Math.sqrt(Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2));
    const c = Math.sqrt(Math.pow(p3.x - p1.x, 2) + Math.pow(p3.y - p1.y, 2));

    const angle = Math.acos((a * a + b * b - c * c) / (2 * a * b));
    return angle * (180 / Math.PI);
}

rulerButton.addEventListener('click', function() {
    this.classList.toggle('active');
    isRuler = !isRuler;
});

protractorButton.addEventListener('click', function() {
    this.classList.toggle('active');
    isProtractor = !isProtractor;
});

d3.select("#toggleDarkMode").on("click", () => {
    document.body.classList.toggle("dark-mode");
    svg.style("background-color", document.body.classList.contains("dark-mode") ? colors.background.dark : colors.background.light);
    render();
});

svg.call(zoom);
svg.on("dblclick.zoom", null);
render();