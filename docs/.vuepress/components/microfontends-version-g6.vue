<template>
    <div :id="this.id">

    </div>
</template>

<script>
    import G6 from '@antv/g6';

    let status1Data = {
        nodes: [{
            id: 'node1',
            x: 100,
            y: 100,
            label: '主应用',
            size: [130, 30],
        },
            {
                id: 'node2',
                x: 300,
                y: 50,
                label: '1-子应用1.0',
                size: [150, 30],
            },
            {
                id: 'node3',
                x: 300,
                y: 150,
                label: '2子应用1.0',
                size: [150, 30]
            }
        ],
        edges: [{
            target: 'node2',
            source: 'node1'
        }, {
            target: 'node3',
            source: 'node1'
        }]
    };
    let status2Data = {
        nodes: [{
            id: 'node1',
            x: 100,
            y: 100,
            label: '主应用',
            size: [130, 30],
        },
            {
                id: 'node2',
                x: 300,
                y: 50,
                label: '1-子应用1.0',
                size: [150, 30],

            },

            {
                id: 'node3',
                x: 300,
                y: 150,
                label: '2-子应用1.1',
                size: [150, 30],
                stateIcon: {
                    show: true,
                    img:
                        'https://gw.alipayobjects.com/zos/basement_prod/c781088a-c635-452a-940c-0173663456d4.svg',
                },
                anchorPoints: [
                    [1, 0.5],
                    [0, 0.5],
                ],
            },
            {
                id: 'node4',
                x: 500,
                y: 100,
                label: '2-子应用1.2',
                size: [150, 30],
                preRect: {
                    fill: '#57e847'
                }

            },
            {
                id: 'node5',
                x: 500,
                y: 200,
                label: '2-子应用1.0',
                size: [150, 30],
                stateIcon: {
                    show: false
                },
                logoIcon: {
                    show: false
                },
                preRect: {
                    fill: '#e81f18'
                }
            },
        ],
        edges: [{
            target: 'node2',
            source: 'node1'
        }, {
            target: 'node3',
            source: 'node1',
            label: '如何保证运行正常？',
            targetAnchor: 1,
            style: {
                lineWidth: 2,
            }
        },
            {
                target: 'node4',
                source: 'node3',
                // type: 'quadratic',
                sourceAnchor: 0,
                style: {
                    lineWidth: 2,
                    stroke: '#57e847'
                },
                label: '版本更新',
                type: 'arc',
            }
            , {
                curveOffset: -20,
                target: 'node5',
                source: 'node3',
                // type: 'quadratic',
                sourceAnchor: 0,
                style: {
                    lineWidth: 2,
                    stroke: '#e81f18'
                },
                label: '废弃',
                type: 'arc',
            }


        ],
    };
    export default {

        mounted() {
            this.initG6()
        },
        props: {
            id: {
                type: String,
                default: ''
            }
        },
        methods: {
            initG6() {
                let self = this;
                let data;
                switch (this.id) {
                    case 'status1':
                        data = status1Data;
                        break;
                    case 'status2':
                        data = status2Data;
                        break;
                }

                const graph = new G6.Graph({
                    container: this.id,
                    width: 700,
                    height: this.id === 'status1' ? 200 : 250,
                    defaultNode: {
                        type: 'modelRect',

                    },
                    nodeStyle: {
                        default: {
                            fill: '#40a9ff',
                            stroke: '#096dd9'
                        }
                    },
                    edgeStyle: {
                        default: {stroke: '#A3B1BF'}
                    }

                });
                graph.read(data);
                // self.createTooltip()
            }
        }
    }
</script>
