// 配置
const config = {
    physicsColor: "#00ccff",
    chemistryColor: "#ffcc00",
    medicineColor: "#ff6666",
    margin: { top: 70, right: 50, bottom: 80, left: 80 },
    width: 1100,      // 大图宽度
    smallWidth: 600,  // 四宫格小图宽度
    height: 450
};

// 工具提示
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// 初始化图表
function initCharts() {
    // chart1 用大宽度
    d3.select("#chart1")
        .append("svg")
        .attr("width", config.width)
        .attr("height", config.height);

    // 其余四张图用小宽度
    d3.select("#chart2")
        .append("svg")
        .attr("width", config.smallWidth)
        .attr("height", config.height);
    d3.select("#chart3")
        .append("svg")
        .attr("width", config.smallWidth)
        .attr("height", config.height);
    d3.select("#chart4")
        .append("svg")
        .attr("width", config.smallWidth)
        .attr("height", config.height);
    d3.select("#chart5")
        .append("svg")
        .attr("width", config.smallWidth)
        .attr("height", config.height);
    
    // 添加标题
    d3.select("#chart1 svg").append("text")
        .attr("x", config.width / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("fill", "#feb47b")
        .attr("font-size", "22px")
        .text("加载数据中...");
    
    d3.select("#chart2 svg").append("text")
        .attr("x", config.smallWidth / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("fill", "#feb47b")
        .attr("font-size", "22px")
        .text("加载数据中...");
    
    d3.select("#chart3 svg").append("text")
        .attr("x", config.smallWidth / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("fill", "#feb47b")
        .attr("font-size", "22px")
        .text("加载数据中...");
}

// 加载并处理数据
async function loadData() {
    try {
        // 加载三个数据集
        const [physicsData, chemistryData, medicineData] = await Promise.all([
            d3.csv("data/Physics publication record.csv"),
            d3.csv("data/Chemistry publication record.csv"),
            d3.csv("data/Medicine publication record.csv")
        ]);
        
        // 处理数据
        const processedData = processData(physicsData, chemistryData, medicineData);
        return processedData;
    } catch (error) {
        console.error("加载数据时出错:", error);
        d3.selectAll(".chart-content svg text")
            .text("数据加载失败，请检查文件路径");
        return null;
    }
}

// 数据处理函数
function processData(physicsData, chemistryData, medicineData) {
    // 为每个数据集添加学科字段
    physicsData.forEach(d => d.field = "Physics");
    chemistryData.forEach(d => d.field = "Chemistry");
    medicineData.forEach(d => d.field = "Medicine");
    
    // 合并数据
    const allData = [...physicsData, ...chemistryData, ...medicineData];
    
    // 转换年份为数字
    allData.forEach(d => {
        d.prize_year = +d["Prize year"];
        d.pub_year = +d["Pub year"];
        // 标准化获奖论文标记，确保大小写一致
        d.isPrizeWinning = (d["Is prize-winning paper"] || "").toUpperCase() === "YES";
    });
    
    // 筛选有效数据 (1900-2016)
    const filteredData = allData.filter(d => 
        d.prize_year >= 1900 && d.prize_year <= 2016
    );
    
    // 按学科和年份分组
    const groupedData = d3.rollup(
        filteredData,
        v => {
            // 获取该学科年份的唯一获奖者ID
            const laureateIDs = [...new Set(v.map(d => d["Laureate ID"]))];
            
            // 获取该学科年份的唯一机构 - 只考虑获奖论文
            const prizeWinningPapers = v.filter(d => d.isPrizeWinning);
            const affiliations = [...new Set(prizeWinningPapers.map(d => d["Affiliation"]))];
            
            return {
                year: v[0].prize_year,
                field: v[0].field,
                laureateCount: laureateIDs.length,
                affiliationCount: affiliations.length,
                affiliations: affiliations
            };
        },
        d => d.field,
        d => d.prize_year
    );
    
    // 创建数据结构用于图表
    const result = {
        physics: [],
        chemistry: [],
        medicine: [],
        physicsJournal: [],
        chemistryJournal: [],
        medicineJournal: []
    };
    
    // 累计机构集合 - 只包含获奖论文的机构
    const cumulativeAffiliations = {
        Physics: new Set(),
        Chemistry: new Set(),
        Medicine: new Set()
    };
    
    // 机构获奖次数统计 - 只考虑获奖论文
    const affiliationCounts = {
        Physics: {},
        Chemistry: {},
        Medicine: {}
    };
    
    // 新增累计期刊集合和期刊获奖次数统计
    const cumulativeJournals = {
        Physics: new Set(),
        Chemistry: new Set(),
        Medicine: new Set()
    };
    const journalCounts = {
        Physics: {},
        Chemistry: {},
        Medicine: {}
    };
    
    // 按年份处理数据
    for (let year = 1900; year <= 2016; year++) {
        // 物理
        if (groupedData.get("Physics") && groupedData.get("Physics").get(year)) {
            const physics = groupedData.get("Physics").get(year);
            result.physics.push({
                year: year,
                laureateCount: physics.laureateCount,
                affiliationCount: physics.affiliationCount
            });
            
            // 更新累计机构 - 只包含获奖论文的机构
            physics.affiliations.forEach(aff => {
                if (aff) { // 确保机构名不为空
                    cumulativeAffiliations.Physics.add(aff);
                }
            });
            result.physics[result.physics.length - 1].cumulativeAffiliationCount = cumulativeAffiliations.Physics.size;
            
            // 更新机构获奖次数 - 只考虑获奖论文
            physics.affiliations.forEach(aff => {
                if (aff) {
                    affiliationCounts.Physics[aff] = (affiliationCounts.Physics[aff] || 0) + 1;
                }
            });
            
            // 计算基尼系数
            result.physics[result.physics.length - 1].gini = calculateGini(
                Object.values(affiliationCounts.Physics)
            );
            
            // 期刊统计（只考虑获奖论文）
            const prizeWinningJournals = physics.affiliations = [...new Set((physics.affiliations || []))]; // 兼容性
            const journals = [...new Set((physics.affiliations || []))]; // 兼容性
            const prizeWinningPapers = filteredData.filter(d => d.field === "Physics" && d.prize_year === year && d.isPrizeWinning);
            const yearJournals = [...new Set(prizeWinningPapers.map(d => d["Journal"]))];
            yearJournals.forEach(journal => {
                if (journal) cumulativeJournals.Physics.add(journal);
                if (journal) journalCounts.Physics[journal] = (journalCounts.Physics[journal] || 0) + 1;
            });
            result.physicsJournal.push({
                year: year,
                journalCount: yearJournals.length,
                cumulativeJournalCount: cumulativeJournals.Physics.size,
                gini: calculateGini(Object.values(journalCounts.Physics))
            });
        }
        
        // 化学
        if (groupedData.get("Chemistry") && groupedData.get("Chemistry").get(year)) {
            const chemistry = groupedData.get("Chemistry").get(year);
            result.chemistry.push({
                year: year,
                laureateCount: chemistry.laureateCount,
                affiliationCount: chemistry.affiliationCount
            });
            
            chemistry.affiliations.forEach(aff => {
                if (aff) {
                    cumulativeAffiliations.Chemistry.add(aff);
                }
            });
            result.chemistry[result.chemistry.length - 1].cumulativeAffiliationCount = cumulativeAffiliations.Chemistry.size;
            
            chemistry.affiliations.forEach(aff => {
                if (aff) {
                    affiliationCounts.Chemistry[aff] = (affiliationCounts.Chemistry[aff] || 0) + 1;
                }
            });
            
            result.chemistry[result.chemistry.length - 1].gini = calculateGini(
                Object.values(affiliationCounts.Chemistry)
            );
            
            const prizeWinningPapers = filteredData.filter(d => d.field === "Chemistry" && d.prize_year === year && d.isPrizeWinning);
            const yearJournals = [...new Set(prizeWinningPapers.map(d => d["Journal"]))];
            yearJournals.forEach(journal => {
                if (journal) cumulativeJournals.Chemistry.add(journal);
                if (journal) journalCounts.Chemistry[journal] = (journalCounts.Chemistry[journal] || 0) + 1;
            });
            result.chemistryJournal.push({
                year: year,
                journalCount: yearJournals.length,
                cumulativeJournalCount: cumulativeJournals.Chemistry.size,
                gini: calculateGini(Object.values(journalCounts.Chemistry))
            });
        }
        
        // 医学
        if (groupedData.get("Medicine") && groupedData.get("Medicine").get(year)) {
            const medicine = groupedData.get("Medicine").get(year);
            result.medicine.push({
                year: year,
                laureateCount: medicine.laureateCount,
                affiliationCount: medicine.affiliationCount
            });
            
            medicine.affiliations.forEach(aff => {
                if (aff) {
                    cumulativeAffiliations.Medicine.add(aff);
                }
            });
            result.medicine[result.medicine.length - 1].cumulativeAffiliationCount = cumulativeAffiliations.Medicine.size;
            
            medicine.affiliations.forEach(aff => {
                if (aff) {
                    affiliationCounts.Medicine[aff] = (affiliationCounts.Medicine[aff] || 0) + 1;
                }
            });
            
            result.medicine[result.medicine.length - 1].gini = calculateGini(
                Object.values(affiliationCounts.Medicine)
            );
            
            const prizeWinningPapers = filteredData.filter(d => d.field === "Medicine" && d.prize_year === year && d.isPrizeWinning);
            const yearJournals = [...new Set(prizeWinningPapers.map(d => d["Journal"]))];
            yearJournals.forEach(journal => {
                if (journal) cumulativeJournals.Medicine.add(journal);
                if (journal) journalCounts.Medicine[journal] = (journalCounts.Medicine[journal] || 0) + 1;
            });
            result.medicineJournal.push({
                year: year,
                journalCount: yearJournals.length,
                cumulativeJournalCount: cumulativeJournals.Medicine.size,
                gini: calculateGini(Object.values(journalCounts.Medicine))
            });
        }
    }
    
    return result;
}

// 计算基尼系数
function calculateGini(values) {
    if (values.length === 0) return 0;
    
    // 按升序排序
    values.sort((a, b) => a - b);
    
    const n = values.length;
    const S = values.reduce((sum, val) => sum + val, 0);
    
    if (S === 0) return 0;
    
    // 计算基尼系数
    let sum = 0;
    for (let i = 0; i < n; i++) {
        sum += (i + 1) * values[i];
    }
    
    const gini = (2 * sum) / (n * S) - (n + 1) / n;
    return Math.max(0, gini); // 确保非负
}

// 更新图表
function updateCharts(data, selectedDiscipline, minYear, maxYear) {
    if (!data) return;
    
    // 根据选择的学科获取数据
    let chartData;
    switch(selectedDiscipline) {
        case "Physics":
            chartData = data.physics;
            break;
        case "Chemistry":
            chartData = data.chemistry;
            break;
        case "Medicine":
            chartData = data.medicine;
            break;
    }
    
    // 筛选年份范围
    chartData = chartData.filter(d => d.year >= minYear && d.year <= maxYear);
    
    // 如果没有数据，显示消息
    if (chartData.length === 0) {
        d3.select("#chart1 svg").html("")
            .append("text")
            .attr("x", config.width / 2)
            .attr("y", config.height / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#feb47b")
            .text("所选年份范围无数据");
        
        d3.select("#chart2 svg").html("")
            .append("text")
            .attr("x", config.smallWidth / 2)
            .attr("y", config.height / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#feb47b")
            .text("所选年份范围无数据");
        
        d3.select("#chart3 svg").html("")
            .append("text")
            .attr("x", config.smallWidth / 2)
            .attr("y", config.height / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#feb47b")
            .text("所选年份范围无数据");
        return;
    }
    
    // 获取颜色
    const color = selectedDiscipline === "Physics" ? config.physicsColor :
                 selectedDiscipline === "Chemistry" ? config.chemistryColor : 
                 config.medicineColor;
    
    // 更新图表1: 每年获奖人数变化
    updateChart1(chartData, color, selectedDiscipline);
    
    // 更新图表2: 累计获奖机构数量
    updateChart2(chartData, color, selectedDiscipline);
    
    // 更新图表3: 机构基尼系数变化
    updateChart3(chartData, color, selectedDiscipline);
    
    // 获取期刊数据
    let chartJournalData;
    switch(selectedDiscipline) {
        case "Physics":
            chartJournalData = data.physicsJournal;
            break;
        case "Chemistry":
            chartJournalData = data.chemistryJournal;
            break;
        case "Medicine":
            chartJournalData = data.medicineJournal;
            break;
    }
    chartJournalData = chartJournalData.filter(d => d.year >= minYear && d.year <= maxYear);
    updateChart4(chartJournalData, color, selectedDiscipline);
    updateChart5(chartJournalData, color, selectedDiscipline);
}

// 更新图表1: 每年获奖人数变化
function updateChart1(data, color, discipline) {
    const svg = d3.select("#chart1 svg");
    svg.selectAll("*").remove();
    
    // 创建图表区域
    const width = config.width - config.margin.left - config.margin.right;
    const height = config.height - config.margin.top - config.margin.bottom;
    
    const g = svg.append("g")
        .attr("transform", `translate(${config.margin.left},${config.margin.top})`);
    
    // 计算10年窗口的累计获奖人数
    const windowSize = 10;
    const aggregatedData = [];
    
    // 按10年分组
    const minYear = d3.min(data, d => d.year);
    const maxYear = d3.max(data, d => d.year);
    
    // 处理完整的10年
    for (let startYear = Math.floor(minYear / 10) * 10; startYear <= maxYear; startYear += 10) {
        const endYear = Math.min(startYear + 9, maxYear); // 确保不超过最大年份
        const periodData = data.filter(d => d.year >= startYear && d.year <= endYear);
        
        if (periodData.length > 0) {
            const totalLaureates = d3.sum(periodData, d => d.laureateCount);
            const totalAffiliations = d3.sum(periodData, d => d.affiliationCount);
            const midYear = startYear + Math.floor((endYear - startYear) / 2); // 使用中点年份作为X轴
            // 只统计有颁奖的年份数
            const validYears = periodData.filter(d => d.laureateCount > 0).length;
            const yearsInPeriod = endYear - startYear + 1;
            
            // 计算年均获奖人数（只除以有颁奖的年份数）
            const avgLaureatesPerYear = validYears > 0 ? totalLaureates / validYears : 0;
            const avgAffiliationsPerYear = validYears > 0 ? totalAffiliations / validYears : 0;
            
            aggregatedData.push({
                startYear: startYear,
                endYear: endYear,
                midYear: midYear,
                period: `${startYear}-${endYear}`,
                totalLaureates: totalLaureates,
                totalAffiliations: totalAffiliations,
                yearsInPeriod: yearsInPeriod,
                validYears: validYears,
                avgLaureatesPerYear: avgLaureatesPerYear,
                avgAffiliationsPerYear: avgAffiliationsPerYear
            });
        }
    }
    
    // 创建比例尺
    const xScale = d3.scaleLinear()
        .domain([
            d3.min(aggregatedData, d => d.midYear), 
            d3.max(aggregatedData, d => d.midYear)
        ])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(aggregatedData, d => d.avgLaureatesPerYear) * 1.2])
        .range([height, 0]);
    
    // 创建坐标轴
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d => Math.round(d))
        .ticks(aggregatedData.length);
    
    const yAxis = d3.axisLeft(yScale).ticks(5);
    
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .selectAll("text")
        .attr("font-size", "14px");
    
    g.append("g")
        .call(yAxis)
        .selectAll("text")
        .attr("font-size", "14px");
    
    // 添加坐标轴标签
    g.append("text")
        .attr("transform", `translate(${width / 2},${height + config.margin.bottom - 25})`)
        .style("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "#feb47b")
        .text("年代中点");
    
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -config.margin.left + 20)
        .attr("x", -height / 2)
        .style("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "#feb47b")
        .text("年均获奖人数");
    
    // 创建折线
    const line = d3.line()
        .x(d => xScale(d.midYear))
        .y(d => yScale(d.avgLaureatesPerYear))
        .curve(d3.curveMonotoneX);
    
    g.append("path")
        .datum(aggregatedData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 4)
        .attr("d", line);
    
    // 添加数据点和标签
    g.selectAll(".data-point")
        .data(aggregatedData)
        .enter().append("g")
        .attr("class", "data-point")
        .attr("transform", d => `translate(${xScale(d.midYear)},${yScale(d.avgLaureatesPerYear)})`)
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .95);
            
            let tooltipContent = `
                <h3>${discipline} ${d.period}</h3>
                <p>年均获奖人数: <b>${d.avgLaureatesPerYear.toFixed(2)}</b></p>
                <p>总获奖人数: <b>${d.totalLaureates}</b></p>
                <p>年均获奖机构: <b>${d.avgAffiliationsPerYear.toFixed(2)}</b></p>
            `;
            
            // 如果不是完整的10年，添加说明（改为显示有颁奖年份数）
            if (d.validYears < d.yearsInPeriod) {
                tooltipContent += `<p><i>注: 此区间有颁奖年份数为 ${d.validYears}</i></p>`;
            }
            
            tooltip.html(tooltipContent)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .each(function(d) {
            const g = d3.select(this);
            
            // 添加点
            g.append("circle")
                .attr("r", 6)
                .attr("fill", color)
                .attr("stroke", "white")
                .attr("stroke-width", 1.5);
            
            // 对于不足10年的数据点，添加特殊标记
            if (d.yearsInPeriod < 10) {
                g.append("circle")
                    .attr("r", 9)
                    .attr("fill", "none")
                    .attr("stroke", color)
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "3,3");
            }
        });
    
    // 添加标题
    g.append("text")
        .attr("x", width / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("fill", "#feb47b")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text(`${discipline} 每10年年均获奖人数趋势`);
    
    // 添加注释
    g.append("text")
        .attr("x", width - 20)
        .attr("y", height - 10)
        .attr("text-anchor", "end")
        .attr("fill", "rgba(255,255,255,0.7)")
        .attr("font-size", "12px")
        .text("注: 虚线圆圈表示不足10年的数据");
}

// 更新图表2: 累计获奖机构数量
function updateChart2(data, color, discipline) {
    const svg = d3.select("#chart2 svg");
    svg.selectAll("*").remove();
    
    // 创建图表区域
    const width = config.smallWidth - config.margin.left - config.margin.right;
    const height = config.height - config.margin.top - config.margin.bottom;
    
    const g = svg.append("g")
        .attr("transform", `translate(${config.margin.left},${config.margin.top})`);
    
    // 创建比例尺
    const xScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.year), d3.max(data, d => d.year)])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.cumulativeAffiliationCount) * 1.1])
        .range([height, 0]);
    
    // 创建坐标轴
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(10);
    const yAxis = d3.axisLeft(yScale).ticks(5);
    
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .selectAll("text")
        .attr("font-size", "14px");
    
    g.append("g")
        .call(yAxis)
        .selectAll("text")
        .attr("font-size", "14px");
    
    // 添加坐标轴标签
    g.append("text")
        .attr("transform", `translate(${width / 2},${height + config.margin.bottom - 25})`)
        .style("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "#feb47b")
        .text("年份");
    
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -config.margin.left + 20)
        .attr("x", -height / 2)
        .style("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "#feb47b")
        .text("累计机构数量");
    
    // 创建折线
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.cumulativeAffiliationCount))
        .curve(d3.curveMonotoneX);
    
    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 4)
        .attr("d", line);
    
    // 添加标题
    g.append("text")
        .attr("x", width / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("fill", "#feb47b")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text(`${discipline} 累计机构数量`);
    
    // 添加用于捕获鼠标事件的透明覆盖层
    const bisect = d3.bisector(d => d.year).left;
    
    // 创建跟随鼠标的垂直线和提示点
    const focus = g.append("g")
        .attr("class", "focus")
        .style("display", "none");
    
    focus.append("line")
        .attr("class", "hover-line")
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3");
    
    focus.append("circle")
        .attr("r", 6)
        .attr("fill", color)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5);
    
    // 添加覆盖层以捕获鼠标事件
    g.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", function() {
            focus.style("display", null);
        })
        .on("mouseout", function() {
            focus.style("display", "none");
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on("mousemove", function(event) {
            const mouseX = d3.pointer(event)[0];
            const x0 = xScale.invert(mouseX);
            const i = bisect(data, x0, 1);
            const d0 = data[i - 1];
            const d1 = data[i];
            
            // 选择最接近的数据点
            const d = x0 - d0.year > d1.year - x0 ? d1 : d0;
            
            // 更新垂直线和点的位置
            focus.attr("transform", `translate(${xScale(d.year)}, 0)`);
            focus.select("circle")
                .attr("cy", yScale(d.cumulativeAffiliationCount));
            
            // 更新提示框
            tooltip.transition()
                .duration(200)
                .style("opacity", .95);
            tooltip.html(`
                <h3>${discipline} ${d.year}</h3>
                <p>累计机构: <b>${d.cumulativeAffiliationCount}</b></p>
                <p>当年机构: <b>${d.affiliationCount}</b></p>
            `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        });
}

// 更新图表3: 机构基尼系数变化
function updateChart3(data, color, discipline) {
    const svg = d3.select("#chart3 svg");
    svg.selectAll("*").remove();
    
    // 创建图表区域
    const width = config.smallWidth - config.margin.left - config.margin.right;
    const height = config.height - config.margin.top - config.margin.bottom;
    
    const g = svg.append("g")
        .attr("transform", `translate(${config.margin.left},${config.margin.top})`);
    
    // 创建比例尺
    const xScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.year), d3.max(data, d => d.year)])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, 1])
        .range([height, 0]);
    
    // 创建坐标轴
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(10);
    const yAxis = d3.axisLeft(yScale).ticks(5);
    
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .selectAll("text")
        .attr("font-size", "14px");
    
    g.append("g")
        .call(yAxis)
        .selectAll("text")
        .attr("font-size", "14px");
    
    // 添加坐标轴标签
    g.append("text")
        .attr("transform", `translate(${width / 2},${height + config.margin.bottom - 25})`)
        .style("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "#feb47b")
        .text("年份");
    
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -config.margin.left + 20)
        .attr("x", -height / 2)
        .style("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "#feb47b")
        .text("基尼系数");
    
    // 添加参考线
    const referenceLines = [0.2, 0.4, 0.6, 0.8];
    referenceLines.forEach(val => {
        g.append("line")
            .attr("x1", 0)
            .attr("y1", yScale(val))
            .attr("x2", width)
            .attr("y2", yScale(val))
            .attr("stroke", "rgba(255, 255, 255, 0.15)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5");
        
        g.append("text")
            .attr("x", width - 10)
            .attr("y", yScale(val) - 8)
            .attr("text-anchor", "end")
            .attr("fill", "rgba(255, 255, 255, 0.7)")
            .attr("font-size", "12px")
            .text(`Gini = ${val}`);
    });
    
    // 创建折线
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.gini))
        .curve(d3.curveMonotoneX);
    
    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 4)
        .attr("d", line);
    
    // 添加标题
    g.append("text")
        .attr("x", width / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("fill", "#feb47b")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text(`${discipline} 机构基尼系数`);
    
    // 添加用于捕获鼠标事件的透明覆盖层
    const bisect = d3.bisector(d => d.year).left;
    
    // 创建跟随鼠标的垂直线和提示点
    const focus = g.append("g")
        .attr("class", "focus")
        .style("display", "none");
    
    focus.append("line")
        .attr("class", "hover-line")
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3");
    
    focus.append("circle")
        .attr("r", 6)
        .attr("fill", color)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5);
    
    // 添加覆盖层以捕获鼠标事件
    g.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", function() {
            focus.style("display", null);
        })
        .on("mouseout", function() {
            focus.style("display", "none");
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on("mousemove", function(event) {
            const mouseX = d3.pointer(event)[0];
            const x0 = xScale.invert(mouseX);
            const i = bisect(data, x0, 1);
            
            // 确保索引在有效范围内
            if (i > 0 && i < data.length) {
                const d0 = data[i - 1];
                const d1 = data[i];
                
                // 选择最接近的数据点
                const d = x0 - d0.year > d1.year - x0 ? d1 : d0;
                
                // 更新垂直线和点的位置
                focus.attr("transform", `translate(${xScale(d.year)}, 0)`);
                focus.select("circle")
                    .attr("cy", yScale(d.gini));
                
                // 更新提示框
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .95);
                tooltip.html(`
                    <h3>${discipline} ${d.year}</h3>
                    <p>基尼系数: <b>${d.gini.toFixed(3)}</b></p>
                    <p>获奖人数: <b>${d.laureateCount}</b></p>
                    <p>累计机构: <b>${d.cumulativeAffiliationCount}</b></p>
                `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            }
        });
}

// 新增 updateChart4（累计获奖期刊数量）
function updateChart4(data, color, discipline) {
    const svg = d3.select("#chart4 svg");
    svg.selectAll("*").remove();
    const width = config.smallWidth - config.margin.left - config.margin.right;
    const height = config.height - config.margin.top - config.margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${config.margin.left},${config.margin.top})`);
    const xScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.year), d3.max(data, d => d.year)])
        .range([0, width]);
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.cumulativeJournalCount) * 1.1])
        .range([height, 0]);
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(10);
    const yAxis = d3.axisLeft(yScale).ticks(5);
    g.append("g").attr("transform", `translate(0,${height})`).call(xAxis).selectAll("text").attr("font-size", "14px");
    g.append("g").call(yAxis).selectAll("text").attr("font-size", "14px");
    g.append("text")
        .attr("transform", `translate(${width / 2},${height + config.margin.bottom - 25})`)
        .style("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "#feb47b")
        .text("年份");
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -config.margin.left + 20)
        .attr("x", -height / 2)
        .style("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "#feb47b")
        .text("累计期刊数量");
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.cumulativeJournalCount))
        .curve(d3.curveMonotoneX);
    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 4)
        .attr("d", line);
    g.append("text")
        .attr("x", width / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("fill", "#feb47b")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text(`${discipline} 累计获奖期刊数量`);
    // 鼠标交互同 chart2
    const bisect = d3.bisector(d => d.year).left;
    const focus = g.append("g").attr("class", "focus").style("display", "none");
    focus.append("line")
        .attr("class", "hover-line")
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3");
    focus.append("circle")
        .attr("r", 6)
        .attr("fill", color)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5);
    g.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", function() { focus.style("display", null); })
        .on("mouseout", function() { focus.style("display", "none"); tooltip.transition().duration(500).style("opacity", 0); })
        .on("mousemove", function(event) {
            const mouseX = d3.pointer(event)[0];
            const x0 = xScale.invert(mouseX);
            const i = bisect(data, x0, 1);
            const d0 = data[i - 1];
            const d1 = data[i];
            const d = x0 - d0.year > d1.year - x0 ? d1 : d0;
            focus.attr("transform", `translate(${xScale(d.year)}, 0)`);
            focus.select("circle").attr("cy", yScale(d.cumulativeJournalCount));
            tooltip.transition().duration(200).style("opacity", .95);
            tooltip.html(`
                <h3>${discipline} ${d.year}</h3>
                <p>累计期刊: <b>${d.cumulativeJournalCount}</b></p>
                <p>当年期刊: <b>${d.journalCount}</b></p>
            `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        });
}

// 新增 updateChart5（期刊基尼系数）
function updateChart5(data, color, discipline) {
    const svg = d3.select("#chart5 svg");
    svg.selectAll("*").remove();
    const width = config.smallWidth - config.margin.left - config.margin.right;
    const height = config.height - config.margin.top - config.margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${config.margin.left},${config.margin.top})`);
    const xScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.year), d3.max(data, d => d.year)])
        .range([0, width]);
    const yScale = d3.scaleLinear()
        .domain([0, 1])
        .range([height, 0]);
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(10);
    const yAxis = d3.axisLeft(yScale).ticks(5);
    g.append("g").attr("transform", `translate(0,${height})`).call(xAxis).selectAll("text").attr("font-size", "14px");
    g.append("g").call(yAxis).selectAll("text").attr("font-size", "14px");
    g.append("text")
        .attr("transform", `translate(${width / 2},${height + config.margin.bottom - 25})`)
        .style("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "#feb47b")
        .text("年份");
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -config.margin.left + 20)
        .attr("x", -height / 2)
        .style("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "#feb47b")
        .text("期刊基尼系数");
    // 参考线
    const referenceLines = [0.2, 0.4, 0.6, 0.8];
    referenceLines.forEach(val => {
        g.append("line")
            .attr("x1", 0)
            .attr("y1", yScale(val))
            .attr("x2", width)
            .attr("y2", yScale(val))
            .attr("stroke", "rgba(255, 255, 255, 0.15)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5");
        g.append("text")
            .attr("x", width - 10)
            .attr("y", yScale(val) - 8)
            .attr("text-anchor", "end")
            .attr("fill", "rgba(255, 255, 255, 0.7)")
            .attr("font-size", "12px")
            .text(`Gini = ${val}`);
    });
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.gini))
        .curve(d3.curveMonotoneX);
    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 4)
        .attr("d", line);
    g.append("text")
        .attr("x", width / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("fill", "#feb47b")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text(`${discipline} 期刊基尼系数`);
    // 鼠标交互同 chart3
    const bisect = d3.bisector(d => d.year).left;
    const focus = g.append("g").attr("class", "focus").style("display", "none");
    focus.append("line")
        .attr("class", "hover-line")
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3");
    focus.append("circle")
        .attr("r", 6)
        .attr("fill", color)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5);
    g.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", function() { focus.style("display", null); })
        .on("mouseout", function() { focus.style("display", "none"); tooltip.transition().duration(500).style("opacity", 0); })
        .on("mousemove", function(event) {
            const mouseX = d3.pointer(event)[0];
            const x0 = xScale.invert(mouseX);
            const i = bisect(data, x0, 1);
            if (i > 0 && i < data.length) {
                const d0 = data[i - 1];
                const d1 = data[i];
                const d = x0 - d0.year > d1.year - x0 ? d1 : d0;
                focus.attr("transform", `translate(${xScale(d.year)}, 0)`);
                focus.select("circle").attr("cy", yScale(d.gini));
                tooltip.transition().duration(200).style("opacity", .95);
                tooltip.html(`
                    <h3>${discipline} ${d.year}</h3>
                    <p>期刊基尼系数: <b>${d.gini.toFixed(3)}</b></p>
                    <p>当年期刊: <b>${d.journalCount}</b></p>
                    <p>累计期刊: <b>${d.cumulativeJournalCount}</b></p>
                `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            }
        });
}

// 初始化
async function init() {
    // 初始化图表容器
    initCharts();
    
    // 加载数据
    const data = await loadData();
    
    // 默认选择物理学
    let selectedDiscipline = "Physics";
    let minYear = 1900;
    let maxYear = 2016;
    
    // 更新图表
    updateCharts(data, selectedDiscipline, minYear, maxYear);
    
    // 添加学科筛选事件
    d3.selectAll(".discipline-btn")
        .on("click", function() {
            // 更新按钮状态
            d3.selectAll(".discipline-btn").classed("active", false);
            d3.select(this).classed("active", true);
            
            // 获取选择的学科
            selectedDiscipline = this.getAttribute("data-discipline");
            
            // 更新图表
            updateCharts(data, selectedDiscipline, minYear, maxYear);
        });
    
    // 添加年份筛选事件
    const lowerSlider = d3.select("#lowerRange");
    const upperSlider = d3.select("#upperRange");
    const sliderFill = d3.select("#sliderFill");
    
    function updateSliderFill() {
        const min = parseInt(lowerSlider.property("value"));
        const max = parseInt(upperSlider.property("value"));
        const minPercent = ((min - 1900) / (2016 - 1900)) * 100;
        const maxPercent = ((max - 1900) / (2016 - 1900)) * 100;
        sliderFill.style("left", minPercent + "%")
                 .style("width", (maxPercent - minPercent) + "%");
    }
    
    function updateYearRange() {
        minYear = +lowerSlider.property("value");
        maxYear = +upperSlider.property("value");
        
        // 确保范围有效
        if (minYear > maxYear) {
            minYear = maxYear;
            lowerSlider.property("value", minYear);
        }
        
        d3.select("#minYear").text(minYear);
        d3.select("#maxYear").text(maxYear);
        updateSliderFill();
        updateCharts(data, selectedDiscipline, minYear, maxYear);
    }
    
    // 添加滑块事件监听器
    lowerSlider.on("input", function() {
        minYear = +this.value;
        if (minYear > maxYear) {
            minYear = maxYear;
            this.value = minYear;
        }
        d3.select("#minYear").text(minYear);
        updateSliderFill();
        updateCharts(data, selectedDiscipline, minYear, maxYear);
    });
    
    upperSlider.on("input", function() {
        maxYear = +this.value;
        if (maxYear < minYear) {
            maxYear = minYear;
            this.value = maxYear;
        }
        d3.select("#maxYear").text(maxYear);
        updateSliderFill();
        updateCharts(data, selectedDiscipline, minYear, maxYear);
    });
    
    // 初始化滑块填充
    updateSliderFill();
}

// 启动应用
document.addEventListener("DOMContentLoaded", init);