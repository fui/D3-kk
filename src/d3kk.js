const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip");

function show_tooltip(message) {
  tooltip.html(message)
      .style("left", `${d3.event.pageX + 3}px`)
      .style("top", `${d3.event.pageY - 28}px`)
      .style("opacity", 1);
}

function hide_tooltip() {
  tooltip.style("opacity", 0);
}

function insert_chart(target_selector, data, colors) {
  const target = d3.select(target_selector);
  const width = target.node().getBoundingClientRect().width;
  const height = 30;

  const scale = d3.scale.linear()
      .domain([0, d3.sum(data, d => d.value)])
      .range([0, width]);

  const percentage = d3.scale.linear()
      .domain([0, d3.sum(data, d => d.value)])
      .range([0, 100]);

  const svg = target.append("svg")
      .attr("width", width)
      .attr("height", height)
      .on("mouseleave", d => hide_tooltip());

  let curx = 0;

  let expanded = false;

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
      .attr("fill", (d, i) => colors[i])
      .on("mousemove", d => {
        if (!expanded) show_tooltip(`${d.label}: ${Math.round(percentage(d.value))}%`)
      });

  svg.on("click", () => {
    if (!expanded) {
      svg.selectAll("text").remove();
      hide_tooltip();

      const col_base = 130;

      let cury = 0;
      for (let i = 0; i < data.length; i++) {
        svg.select(".rect-" + i)
            .transition()
            .duration(100)
            .attr("y", cury)
            .transition()
            .duration(100)
            .attr("x", col_base);

        let font_size = 16;
        const label_base = col_base - 5;

        // Make sure the text we are making will fit. Since we are not actually
        // rendering the text yet, render dummy nodes to measure.
        let measured_text_width;
        do {
          const dummy = svg.append("text")
              .attr("font-size", font_size + "px")
              .text(data[i].label);
          measured_text_width = dummy.node().getBoundingClientRect().width;
          dummy.remove();
          if (measured_text_width > label_base) font_size--;
        } while (measured_text_width > label_base);

        svg.append("text")
            .transition()
            .delay(200)
            .attr("x", label_base)
            .attr("y", cury + (height / 2))
            .attr("alignment-baseline", "middle")
            .attr("dominant-baseline", "middle")
            .attr("text-anchor", "end")
            .attr("font-size", font_size + "px")
            .text(data[i].label);

        let labelinside = percentage(data[i].value) > 20;
        let col_width = scale(data[i].value);

        if (col_width + col_base > width) {
          col_width = width - col_base;

          // The following is just a roundabout way to draw a zig-zag marker
          // on the column, to indicate that it has been truncated.
          const yScale = d3.scale.linear()
              .domain([0, 100])
              .range([0, height]);
          const area = d3.svg.line()
              .x(d => (d.x / 3) + (col_base + col_width / 2))
              .y(d => cury + yScale(d.y));

          svg.append('path')
              .datum([
                {'x': 0, 'y': 0},
                {'x': 25, 'y': 33},
                {'x': 0, 'y': 66},
                {'x': 25, 'y': 100},
                {'x': 50, 'y': 100},
                {'x': 25, 'y': 66},
                {'x': 50, 'y': 33},
                {'x': 25, 'y': 0}
              ])
              .attr('fill', 'white')
              .transition()
              .delay(200)
              .attr('d', area);
        }

        svg.append("text")
            .transition()
            .delay(200)
            .attr("x", col_base + (labelinside ? col_width - 5 : col_width + 5))
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
      svg.selectAll("path").remove();

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

let insert_stacked = function(target_selector, data, colors) {
  const target = d3.select(target_selector);
  const width = target.node().getBoundingClientRect().width;
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

  const svg = target.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("style", `margin-left: -${margin.left}px; ` +
                     `margin-right: -${margin.right}px;`)
      .on("mouseleave", d => hide_tooltip())
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
      .style("fill", (d, i) => colors[i])
      .on("mousemove", d => show_tooltip(d.key));

  svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);
};
