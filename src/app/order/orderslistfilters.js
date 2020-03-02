import React, { Component } from 'react';
import {
    StyleSheet, Text, View, ActivityIndicator, TouchableOpacity,
    Modal, ToastAndroid
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RadioButtons from '../commoncomponents/radiobuttons'
import * as SecureStore from 'expo-secure-store';
import Base64 from '../../utility/base64';

const config = require('../../../config.json');

export default class OrdersListFilters extends Component {
    constructor(props) {
        super(props);
        this.state = {
            base_url: null,
            username: null,
            password: null,
            filterModalShown: false,
            areOrderStatusesReady: false,
            orderStatusOptions: [],
            selectedOrderStatus: null,
        }
        this._isMounted = false;
    }

    async componentDidMount() {
        this._isMounted = true
        this._isMounted && await this.getCredentials()
        this._isMounted && this.fetchOrderStatus()
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    render() {
        return (
            <View>
                {this.displayFilterButton()}
                {this.displayFilterModal()}
            </View>
        )
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

    //Fetch Functions Below

    fetchOrderStatus = () => {
        const { base_url, username, password } = this.state;
        const orderStatusesurl = `${base_url}/wp-json/dokan/v1/orders/summary`;
        const headers = {
            'Authorization': `Basic ${Base64.btoa(username + ':' + password)}`
        }
        fetch(orderStatusesurl, {
            method: 'GET',
            headers: headers
        }).then(response => response.json())
            .then(responseJson => {
                if ('code' in responseJson) {
                    this.setState({
                        error: responseJson.code
                    }, this.fetchOrderProductImages)
                    ToastAndroid.show(`Can't fetch other order statuses. Error: ${responseJson.code}`, ToastAndroid.LONG);
                } else {
                    let orderStatusArray = [['all', 'all']];
                    if (responseJson) {
                        Object.keys(responseJson).forEach(key => {
                            if (key != 'total') {
                                orderStatusArray.push([key, key])
                            }
                        })
                    }
                    this.setState({
                        orderStatusOptions: orderStatusArray,
                        areOrderStatusesReady: true
                    }, this.fetchOrderProductImages)
                }
            })
    }

    //Display Functions Below

    displayFilterButton = () => {
        return (
            <TouchableOpacity
                onPress={() => {
                    this.setState({
                        filterModalShown: true
                    })
                }}
                style={styles.filterBtn}
            >
                <View style={{
                    flex: 1,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <Ionicons name='md-funnel' height size={20} color={config.colors.iconLightColor} />
                    <Text style={styles.filterBtnText}>Filter</Text>
                </View>
            </TouchableOpacity>
        )
    }

    displayFilterModal = () => {
        return (
            <Modal
                transparent={false}
                visible={this.state.filterModalShown}
            >
                <View style={{ flex: 1 }}>
                    <View style={styles.section}>
                        <Text style={styles.titleText}>Filter By</Text>
                        <Text style={styles.h2Text}>Order Status</Text>
                        {this.state.areOrderStatusesReady
                            ? <RadioButtons
                                options={this.state.orderStatusOptions}
                                value={this.state.selectedOrderStatus}
                                selectedValue={(selectedValue) => {
                                    this.setState({
                                        selectedOrderStatus: selectedValue
                                    })
                                }}
                            />
                            : <View style={{
                                flex: -1, justifyContent: "center",
                                alignContent: "center", padding: 20
                            }}>
                                <ActivityIndicator color={config.colors.loadingColor} size='large' />
                            </View>
                        }
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                        this.setState({
                            filterModalShown: false
                        })
                    }}
                >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={() => {
                        this.props.onApplyFilter(this.state.selectedOrderStatus)
                        this.setState({
                            filterModalShown: false
                        })
                    }}
                >
                    <Text style={styles.applyBtnText}>Apply</Text>
                </TouchableOpacity>
            </Modal>
        )
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
    h2Text: {
        fontWeight: 'bold',
    },
    filterBtn: {
        backgroundColor: config.colors.btnColor,
        height: 40
    },
    filterBtnText: {
        color: config.colors.btnTextColor,
        fontWeight: 'bold',
        marginLeft: 5
    },
    cancelBtn: {
        backgroundColor: 'red',
        height: 50,
        justifyContent: 'center',
        alignItems: 'center'
    },
    cancelBtnText: {
        color: config.colors.btnTextColor,
        fontWeight: 'bold',
    },
    applyBtn: {
        backgroundColor: config.colors.btnColor,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center'
    },
    applyBtnText: {
        color: config.colors.btnTextColor,
        fontWeight: 'bold',
    }
});