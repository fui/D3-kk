const width = 400;
const height = 30;

let insert_chart = function(target, data, colors) {
  const scale = d3.scale.linear()
      .domain([0, d3.sum(data, d => d.value)])
      .range([0, width]);

  const percentage = d3.scale.linear()
      .domain([0, d3.sum(data, d => d.value)])
      .range([0, 100]);

  const svg = d3.select(target).append("svg")
      .attr("width", width)
      .attr("height", height);

  let curx = 0;

  svg.selectAll("rect")
      .data(data)
    .enter().append("rect")
      .attr("class", (d, i) => "rect-" + i)
      .attr("width", d => scale(d.value))
      .attr("height", height)
      .attr("x", d => {
        let ret = curx;
        curx += scale(d.value);
        return ret;
      })
      .attr("y", 0)
      .attr("fill", (d, i) => colors[i]);

  let expanded = false;

  svg.on("click", () => {
    if (!expanded) {
      svg.selectAll("text").remove();

      let cury = 0;
      for (let i = 0; i < data.length; i++) {
        svg.select(".rect-" + i)
            .transition()
            .duration(100)
            .attr("y", cury)
            .transition()
            .duration(100)
            .attr("x", 130);

        svg.append("text")
            .transition()
            .delay(200)
            .attr("x", 125)
            .attr("y", cury + (height / 2))
            .attr("alignment-baseline", "middle")
            .attr("dominant-baseline", "middle")
            .attr("text-anchor", "end")
            .text(data[i].label);

        let labelinside = percentage(data[i].value) > 20;
        let width = scale(data[i].value);

        svg.append("text")
            .transition()
            .delay(200)
            .attr("x", 130 + (labelinside ? width - 5 : width + 5))
            .attr("y", cury + (height / 2))
            .attr("dominant-baseline", "middle")
            .attr("text-anchor", labelinside ? "end" : "start")
            .text(Math.round(percentage(data[i].value)) + "%");

        cury += height;
      }

      svg.transition()
          .duration(100)
          .attr("height", cury);

      expanded = true;
    } else {
      svg.selectAll("text").remove();

      let curx = 0;
      svg.selectAll("rect")
          .transition()
          .duration(100)
          .attr("x", d => {
            let ret = curx;
            curx += scale(d.value);
            return ret;
          })
          .transition()
          .duration(100)
          .attr("y", 0);

      svg.transition()
          .delay(100)
          .duration(100)
          .attr("height", height);

      expanded = false;
    }
  });
};

let insert_stacked = function(target, data, colors) {
  const height = 300;
  const margin = {
    left: 30,
    right: 30,
    top: 0,
    bottom: 30
  };

  data.forEach(year => {
    year.data.forEach(point => {
      point.year = year.label;
    });
  });

  const xScale = d3.scale.linear()
      .domain(d3.extent(data, d => d.label))
      .range([0, width]);

  const yScale = d3.scale.linear()
      .domain([0, 1])
      .range([0, height]);

  const svg = d3.select(target).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("style", `margin-left: -${margin.left}px; ` +
                     `margin-right: -${margin.right}px;`)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  const xAxis = d3.svg.axis()
      .scale(xScale)
      .orient("bottom")
      .ticks(data.length)
      .tickValues(data.map(x => x.label))
      .tickFormat(d3.format("d"));

  const stacking = d3.layout.stack()
      .offset("expand")
      .values(d => d.values)
      .x(d => d.year)
      .y(d => d.value);

  const unnested = [].concat.apply([], data.map(year => year.data));

  const nested = d3.nest()
      .key(d => d.label)
      .entries(unnested);

  const layers = stacking(nested);

  const area = d3.svg.area()
      .x(d => xScale(d.year))
      .y0(d => yScale(d.y0))
      .y1(d => yScale(d.y0 + d.y));

  svg.selectAll(".layer")
      .data(layers)
    .enter().append("path")
      .attr("class", "layer")
      .attr("d", d => area(d.values))
      .style("fill", (d, i) => colors[i]);

  svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);
};
