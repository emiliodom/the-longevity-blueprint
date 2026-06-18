/**
 * charts.js — Vue 3 Chart.js Wrapper Components
 *
 * BarChart  — vertical bar, accepts chartData + chartOptions props
 * DonutChart — doughnut, fixed legend on right, accepts chartData + chartOptions props
 *
 * Both components:
 *   - Initialize Chart.js on `mounted()`
 *   - Destroy the instance on `beforeUnmount()` to prevent canvas reuse errors
 *   - Watch props and fully rebuild the chart when data changes
 */

/* global app */

app.component('BarChart', {
  props: {
    chartData:    { type: Object, required: true },
    chartOptions: { type: Object, default: () => ({}) }
  },
  data() { return { chart: null }; },
  mounted()        { this.buildChart(); },
  beforeUnmount()  { this.chart?.destroy(); },
  watch: {
    chartData:    { deep: true, handler() { this.buildChart(); } },
    chartOptions: { deep: true, handler() { this.buildChart(); } }
  },
  methods: {
    buildChart() {
      if (this.chart) { this.chart.destroy(); this.chart = null; }
      const defaults = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { labels: { color: '#94a3b8' } }
        },
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { color: '#1e3a5f' } },
          y: { ticks: { color: '#64748b' }, grid: { color: '#1e3a5f' } }
        }
      };
      this.chart = new Chart(this.$refs.cv, {
        type: 'bar',
        data: this.chartData,
        options: Object.assign({}, defaults, this.chartOptions)
      });
    }
  },
  template: `<canvas ref="cv"></canvas>`
});

app.component('DonutChart', {
  props: {
    chartData:    { type: Object, required: true },
    chartOptions: { type: Object, default: () => ({}) }
  },
  data() { return { chart: null }; },
  mounted()        { this.buildChart(); },
  beforeUnmount()  { this.chart?.destroy(); },
  watch: {
    chartData:    { deep: true, handler() { this.buildChart(); } },
    chartOptions: { deep: true, handler() { this.buildChart(); } }
  },
  methods: {
    buildChart() {
      if (this.chart) { this.chart.destroy(); this.chart = null; }
      const defaults = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'right',
            labels:   { color: '#94a3b8', boxWidth: 14 }
          }
        },
        cutout: '65%'
      };
      this.chart = new Chart(this.$refs.cv, {
        type: 'doughnut',
        data: this.chartData,
        options: Object.assign({}, defaults, this.chartOptions)
      });
    }
  },
  template: `<canvas ref="cv"></canvas>`
});
