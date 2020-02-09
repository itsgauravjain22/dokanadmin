import React, { Component } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import Moment from 'moment';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import GLOBAL from './orderglobal'
import SearchBar from '../commoncomponents/searchbar'
import Base64 from '../../utility/base64';

const config = require('../../../config.json');

export default class OrdersList extends Component {

    static navigationOptions = ({ navigation }) => {
        return {
            headerTitle: 'Orders',
            headerRight: () => (
                <TouchableOpacity
                    style={{ paddingRight: 20 }}
                    onPress={() => { navigation.navigate("Settings") }}
                >
                    <Ionicons name='md-more' size={25} color={config.colors.iconLightColor} />
                </TouchableOpacity>
            ),
        }
    };

    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            hasMoreToLoad: true,
            searchValue: '',
            data: [],
            page: 1,
            error: null,
            refreshing: false,
            base_url: null,
            username: null,
            password: null,
        };
        GLOBAL.orderslistScreen = this
        this._isMounted = false;
    }

    async componentDidMount() {
        this._isMounted = true;
        this._isMounted && await this.getCredentials();
        this._isMounted && this.fetchOrdersList();
    }

    componentWillUnmount() {
        this._isMounted = false;
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

    fetchOrdersList = () => {
        const { base_url, username, password, page, searchValue } = this.state;
        let url = `${base_url}/wp-json/dokan/v1/orders?per_page=20&page=${page}`;
        let headers = {
            'Authorization': `Basic ${Base64.btoa(username + ':' + password)}`
        }
        if (searchValue) {
            url = url.concat(`&search=${searchValue}`)
        }
        this.setState({ loading: true });
        setTimeout(() => {
            fetch(url, {
                method: 'GET',
                headers: headers
            }).then((response) => response.json())
                .then((responseJson) => {
                    if (Array.isArray(responseJson) && responseJson.length) {
                        this.setState({
                            hasMoreToLoad: true,
                            data: this.state.data.concat(responseJson),
                            error: responseJson.error || null,
                            loading: false,
                            refreshing: false
                        });
                    } else {
                        this.setState({
                            hasMoreToLoad: false,
                            error: responseJson.code || null,
                            loading: false,
                            refreshing: false
                        });
                    }
                }).catch((error) => {
                    this.setState({
                        hasMoreToLoad: false,
                        error,
                        loading: false,
                        refreshing: false
                    })
                });
        }, 1000);
    };

    renderListSeparator = () => {
        return (
            <View style={{
                height: 1,
                width: '100%',
                backgroundColor: '#999999'
            }} />
        )
    }

    renderListFooter = () => {
        if (!this.state.loading) return null;

        return (
            <View style={{
                paddingVertical: 20,
            }}>
                <ActivityIndicator color={config.colors.loadingColor} size='large' />
            </View>
        )
    }

    handleRefresh = () => {
        this.setState({
            page: 1,
            refreshing: true,
            data: []
        },
            () => {
                this.fetchOrdersList();
            }
        )
    }

    handleLoadMore = () => {
        this.setState({
            page: this.state.page + 1,
        }, () => {
            this.fetchOrderList();
        }
        )
    }

    handleSearch = (value) => {
        this._isMounted && this.setState({
            searchValue: value,
            page: 1,
            refreshing: true,
            data: []
        }, () => {
            this.fetchOrderList()
        })
    }

    renderItem = ({ item }) => {
        return (
            <TouchableOpacity onPress={() => {
                this.props.navigation.navigate('OrderDetails', {
                    orderId: item.id
                });
            }}>
                <View
                    style={{
                        flex: 1,
                        paddingTop: 10,
                        paddingBottom: 10,
                        backgroundColor: 'white',
                        justifyContent: 'center',
                    }}>
                    <View style={{ marginLeft: 10 }}>
                        <Text>{Moment(item.date_created).format('dddd, Do MMM YYYY h:m:s a')}</Text>
                        <Text style={styles.titleText}>#{item.number} {item.billing.first_name} {item.billing.last_name}</Text>
                        <Text>Status: {item.status}</Text>
                        <Text>Total: {item.currency_symbol ? item.currency_symbol : item.currency}{item.total}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        )
    }

    render() {
        return (
            <View style={{ flex: 1 }}>
                <SearchBar onSearchPress={this.handleSearch}></SearchBar>
                <FlatList
                    data={this.state.data}
                    keyExtractor={item => item.id.toString()}
                    refreshing={this.state.refreshing}
                    onRefresh={this.handleRefresh}
                    onEndReached={this.state.hasMoreToLoad ? this.handleLoadMore : null}
                    onEndReachedThreshold={0.5}
                    ItemSeparatorComponent={this.renderListSeparator}
                    ListFooterComponent={this.renderListFooter}
                    renderItem={this.renderItem}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    titleText: {
        fontSize: 20,
        fontWeight: 'bold',
    }
});
