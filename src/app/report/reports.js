import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Base64 from '../../utility/base64';
import { Ionicons } from '@expo/vector-icons';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryPie } from 'victory-native';
import moment from 'moment';

const config = require('../../../config.json');

export default class Reports extends Component {

    static navigationOptions = ({ navigation }) => {
        return {
            title: 'Reports',
            headerRight: () => (
                <TouchableOpacity
                    style={{ paddingRight: 20 }}
                    onPress={() => { navigation.navigate("Settings") }}
                >
                    <Ionicons name='md-more' size={25} color={config.colors.iconLightColor} />
                </TouchableOpacity>
            ),
        };
    };

    constructor(props) {
        super(props);
        this.state = {
            base_url: null,
            username: null,
            password: null,
            refreshing: false,
            showFromDateSelector: false,
            fromDate: moment().subtract(7, 'days').toDate(),
            showToDateSelector: false,
            toDate: moment().toDate(),
            isSummaryReportDataReady: false,
            summaryReportData: {},
            isProductsSummaryDataReady: false,
            productsSummaryData: {},
            isReviewsSummaryDataReady: false,
            reviewsSummaryData: {}
        };
        this._isMounted = false;
    }

    async componentDidMount() {
        this._isMounted = true;
        this._isMounted && await this.getCredentials()
        this._isMounted && this.fetchAllReports()
    }

    getCredentials = async () => {
        const credentials = await SecureStore.getItemAsync('credentials');
        const credentialsJson = JSON.parse(credentials)
        this.setState({
            base_url: credentialsJson.base_url,
            username: credentialsJson.username,
            password: credentialsJson.password,
        })
    }

    render() {
        return (
            <ScrollView
                style={{ flex: 1 }}
                horizontal={false}
                refreshControl={
                    <RefreshControl
                        refreshing={false}
                        onRefresh={this.fetchAllReports}
                    />
                }
            >
                {this.displaySummaryReportSection()}
                {this.displayOrdersCountReportSection()}
                {this.displayProductsCountSection()}
                {this.displayReviewsCountSection()}
            </ScrollView>
        );
    }

    //Fetch Function Below

    fetchAllReports = () => {
        this.fetNonDateBasedReports()
    }

    fetNonDateBasedReports = () => {
        this.fetchSummaryReport()
        this.fetchProductsSummaryReport()
        this.fetchReviewsSummaryReport()
    }

    fetchSummaryReport = () => {
        const { base_url, username, password } = this.state;
        const url = `${base_url}/wp-json/dokan/v1/reports/summary`;
        this.setState({ isSummaryReportDataReady: false });
        fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Basic ${Base64.btoa(username + ':' + password)}`
            }
        }).then((response) => response.json())
            .then((responseJson) => {
                this.setState({
                    summaryReportData: responseJson,
                    error: responseJson.code || null,
                }, () => {
                    if ('sales' in this.state.summaryReportData) {
                        this.setState({
                            isSummaryReportDataReady: true
                        })
                    } else {
                        this.setState({
                            isSummaryReportDataReady: false
                        })
                    }
                });
            }).catch((error) => {
                this.setState({
                    error,
                    isSummaryReportDataReady: false
                })
            });
    }

    fetchProductsSummaryReport = () => {
        if (config.modules.productsModuleEnabled) {
            const { base_url, username, password } = this.state;
            const url = `${base_url}/wp-json/dokan/v1/products/summary`;
            this.setState({ isProductsSummaryDataReady: false });
            fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Basic ${Base64.btoa(username + ':' + password)}`
                }
            }).then((response) => response.json())
                .then((responseJson) => {
                    this.setState({
                        productsSummaryData: responseJson,
                        error: responseJson.code || null,
                    }, () => {
                        if ('post_counts' in this.state.productsSummaryData) {
                            this.setState({
                                isProductsSummaryDataReady: true
                            })
                        } else {
                            this.setState({
                                isProductsSummaryDataReady: false
                            })
                        }
                    });
                }).catch((error) => {
                    this.setState({
                        error,
                        isProductsSummaryDataReady: false
                    })
                });
        }
    }

    fetchReviewsSummaryReport = () => {
        if (config.modules.reviewsModulesEnables) {
            const { base_url, username, password } = this.state;
            const url = `${base_url}/wp-json/dokan/v1/reviews/summary`;
            this.setState({ isReviewsSummaryDataReady: false });
            fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Basic ${Base64.btoa(username + ':' + password)}`
                }
            }).then((response) => response.json())
                .then((responseJson) => {
                    this.setState({
                        reviewsSummaryData: responseJson,
                        error: responseJson.code || null,
                    }, () => {
                        if ('comment_counts' in this.state.reviewsSummaryData) {
                            this.setState({
                                isReviewsSummaryDataReady: true
                            })
                        } else {
                            this.setState({
                                isReviewsSummaryDataReady: false
                            })
                        }
                    });
                }).catch((error) => {
                    this.setState({
                        error,
                        isReviewsSummaryDataReady: false
                    })
                });
        }
    }

    //Display Functions Below

    displaySummaryReportSection = () => {
        return (
            <View style={styles.section}>
                <Text style={styles.titleText}>Store Summary</Text>
                {this.state.isSummaryReportDataReady
                    ? <View>
                        <Text>Total Pageviews: {this.state.summaryReportData.pageviews}</Text>
                        <Text>Total Sales: {this.state.summaryReportData.sales}</Text>
                    </View>
                    : <View style={{
                        flex: -1, justifyContent: "center",
                        alignContent: "center", padding: 20
                    }}>
                        <ActivityIndicator color={config.colors.loadingColor} size='large' />
                    </View>}
            </View>
        )
    }

    displayOrdersCountReportSection = () => {
        if (config.modules.ordersModuleEnabled) {
            let orderSummaryGraphData = []
            if (this.state.isSummaryReportDataReady && 'orders_count' in this.state.summaryReportData) {
                Object.keys(this.state.summaryReportData.orders_count).forEach(key => {
                    if (key != 'total') {
                        orderSummaryGraphData.push({
                            name: key,
                            total: this.state.summaryReportData.orders_count[key]
                        })
                    }
                })
            }
            return (
                <View style={styles.section}>
                    <Text style={styles.titleText}>Orders Count</Text>
                    {this.state.isSummaryReportDataReady
                        ? <View>
                            <Text>Total Orders: {this.state.summaryReportData.orders_count.total}</Text>
                            <View style={styles.graphsView}>
                                <VictoryChart
                                    domainPadding={10}
                                    padding={{ left: 40, bottom: 90, right: 50, top: 20 }}
                                >
                                    <VictoryAxis
                                        style={{
                                            axis: { stroke: 'black' },
                                            axisLabel: { fontSize: 16, fill: 'black' },
                                            ticks: { stroke: 'black' },
                                            tickLabels: { fontSize: 12, fill: 'black' },
                                            grid: { stroke: 'gray', strokeWidth: 0.25 }
                                        }} dependentAxis
                                    />
                                    <VictoryAxis
                                        style={{
                                            axis: { stroke: 'black' },
                                            axisLabel: { fontSize: 16, fill: 'black' },
                                            ticks: { stroke: 'black' },
                                            tickLabels: {
                                                fontSize: 12, fill: 'black', verticalAnchor: 'middle',
                                                textAnchor: 'start', angle: 45
                                            }
                                        }}
                                    />
                                    <VictoryBar
                                        data={orderSummaryGraphData}
                                        x='name'
                                        y='total'
                                        labels={({ datum }) => datum._y}
                                        style={{
                                            data: { fill: config.colors.barChartDataColor },
                                            labels: { fill: 'black' }
                                        }}
                                        barRatio={1}
                                        horizontal={false}
                                    />
                                </VictoryChart>
                            </View>
                        </View>
                        : <View style={{
                            flex: -1, justifyContent: "center",
                            alignContent: "center", padding: 20
                        }}>
                            <ActivityIndicator color={config.colors.loadingColor} size='large' />
                        </View>}
                </View >
            )
        } else {
            return <></>
        }
    }

    displayProductsCountSection = () => {
        if (config.modules.productsModuleEnabled) {
            let productsCountData = []
            if (this.state.isProductsSummaryDataReady) {
                Object.keys(this.state.productsSummaryData.post_counts).forEach(key => {
                    if (key != 'total') {
                        productsCountData.push({
                            name: key,
                            total: this.state.productsSummaryData.post_counts[key]
                        })
                    }
                })
            }
            return (
                <View style={styles.section}>
                    <Text style={styles.titleText}>Products Count</Text>
                    {this.state.isProductsSummaryDataReady
                        ? <View>
                            <Text>Total Products: {this.state.productsSummaryData.post_counts.total}</Text>
                            <View style={styles.graphsView}>
                                <VictoryChart
                                    domainPadding={10}
                                    padding={{ left: 40, bottom: 90, right: 50, top: 20 }}
                                >
                                    <VictoryAxis
                                        style={{
                                            axis: { stroke: 'black' },
                                            axisLabel: { fontSize: 16, fill: 'black' },
                                            ticks: { stroke: 'black' },
                                            tickLabels: { fontSize: 12, fill: 'black' },
                                            grid: { stroke: 'gray', strokeWidth: 0.25 }
                                        }} dependentAxis
                                    />
                                    <VictoryAxis
                                        style={{
                                            axis: { stroke: 'black' },
                                            axisLabel: { fontSize: 16, fill: 'black' },
                                            ticks: { stroke: 'black' },
                                            tickLabels: {
                                                fontSize: 12, fill: 'black', verticalAnchor: 'middle',
                                                textAnchor: 'start', angle: 45
                                            }
                                        }}
                                    />
                                    <VictoryBar
                                        data={productsCountData}
                                        x='name'
                                        y='total'
                                        labels={({ datum }) => datum._y}
                                        style={{
                                            data: { fill: config.colors.barChartDataColor },
                                            labels: { fill: 'black' }
                                        }}
                                        barRatio={1}
                                        horizontal={false}
                                    />
                                </VictoryChart>
                            </View>
                        </View>
                        : <View style={{
                            flex: -1, justifyContent: "center",
                            alignContent: "center", padding: 20
                        }}>
                            <ActivityIndicator color={config.colors.loadingColor} size='large' />
                        </View>}
                </View >
            )
        } else {
            return <></>
        }
    }

    displayReviewsCountSection = () => {
        if (config.modules.reviewsModulesEnables) {
            let reviewsCountData = []
            if (this.state.isReviewsSummaryDataReady) {
                Object.keys(this.state.reviewsSummaryData.comment_counts).forEach(key => {
                    if (key != 'total') {
                        reviewsCountData.push({
                            name: key,
                            total: this.state.reviewsSummaryData.comment_counts[key]
                        })
                    }
                })
            }
            return (
                <View style={styles.section}>
                    <Text style={styles.titleText}>Reviews Count</Text>
                    {this.state.isReviewsSummaryDataReady
                        ? <View>
                            <Text>Total Reviews: {this.state.reviewsSummaryData.comment_counts.total}</Text>
                            <View style={styles.graphsView}>
                                <VictoryChart
                                    domainPadding={10}
                                    padding={{ left: 40, bottom: 90, right: 50, top: 20 }}
                                >
                                    <VictoryAxis
                                        style={{
                                            axis: { stroke: 'black' },
                                            axisLabel: { fontSize: 16, fill: 'black' },
                                            ticks: { stroke: 'black' },
                                            tickLabels: { fontSize: 12, fill: 'black' },
                                            grid: { stroke: 'gray', strokeWidth: 0.25 }
                                        }} dependentAxis
                                    />
                                    <VictoryAxis
                                        style={{
                                            axis: { stroke: 'black' },
                                            axisLabel: { fontSize: 16, fill: 'black' },
                                            ticks: { stroke: 'black' },
                                            tickLabels: {
                                                fontSize: 12, fill: 'black', verticalAnchor: 'middle',
                                                textAnchor: 'start', angle: 45
                                            }
                                        }}
                                    />
                                    <VictoryBar
                                        data={reviewsCountData}
                                        x='name'
                                        y='total'
                                        labels={({ datum }) => datum._y}
                                        style={{
                                            data: { fill: config.colors.barChartDataColor },
                                            labels: { fill: 'black' }
                                        }}
                                        barRatio={1}
                                        horizontal={false}
                                    />
                                </VictoryChart>
                            </View>
                        </View>
                        : <View style={{
                            flex: -1, justifyContent: "center",
                            alignContent: "center", padding: 20
                        }}>
                            <ActivityIndicator color={config.colors.loadingColor} size='large' />
                        </View>}
                </View >
            )
        } else {
            return <></>
        }
    }
}

const styles = StyleSheet.create({
    section: {
        marginTop: 15,
        marginLeft: 15,
        marginRight: 15
    },
    titleText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    graphsView: {
        flex: -1,
        flexDirection: 'row',
        marginLeft: 15,
        justifyContent: 'center',
        alignItems: 'center'
    }
});