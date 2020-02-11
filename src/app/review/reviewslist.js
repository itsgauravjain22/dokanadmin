import React, { Component } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import Base64 from '../../utility/base64';
import Moment from 'moment';

const config = require('../../../config.json');

export default class ProductsList extends Component {

    static navigationOptions = ({ navigation }) => {
        return {
            headerTitle: 'Reviews',
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
            data: [],
            page: 1,
            error: null,
            refreshing: false,
            base_url: null,
            username: null,
            password: null,
        };
        this._isMounted = false;
    }

    async componentDidMount() {
        this._isMounted = true;
        this._isMounted && await this.getCredentials();
        this._isMounted && this.fetchReviewsList();
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

    fetchReviewsList = () => {
        const { base_url, username, password, page } = this.state;
        let url = `${base_url}/wp-json/dokan/v1/reviews?per_page=20&page=${page}`;
        let headers = {
            'Authorization': `Basic ${Base64.btoa(username + ':' + password)}`
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
    }

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
                this.fetchReviewsList();
            }
        )
    }

    handleLoadMore = () => {
        this.setState({
            page: this.state.page + 1,
        }, () => {
            this.fetchReviewsList();
        }
        )
    }

    displayRatingStar = (id, starCount) => {
        let ratingStars = []
        for (let i = 1; i <= starCount; i++) {
            ratingStars.push(
                <Ionicons key={`rating_${id}_${i}`} name="md-star" size={20} color={config.colors.ratingStarColor} />
            )
        }
        return ratingStars
    }

    renderItem = ({ item }) => {
        return (
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
                    <Text style={styles.titleText}>{item.name}</Text>
                    <Text>{this.displayRatingStar(item.id, item.rating)}</Text>
                    <Text>{item.review}</Text>
                </View>
            </View>
        )
    }

    render() {
        return (
            <View style={{ flex: 1 }}>
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