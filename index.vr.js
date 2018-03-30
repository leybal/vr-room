import React from 'react';
import {
  AppRegistry,
  Pano,
  View,
  AmbientLight,
  Scene,
  Model,
  VrHeadModel,
  Text,
  VrButton
} from 'react-vr';

import io from 'socket.io-client';


const DEFAULT_ANIMATION_BUTTON_RADIUS = 50;
const DEFAULT_ANIMATION_BUTTON_SIZE = 0.05;
const DEFAULT_LOCATIONS = [[0,0,-1], [-1,0,0], [0,0,1], [1,0,0]];
const STEP = 1;
const MAX_AREA = 10;

const textStyle = {
  fontSize: 0.1,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0.02,
  paddingRight: 0.02,
  textAlign: 'center',
  textAlignVertical: 'center',
};
const buttonStyle = {
  width: 0.15,
  height:0.15,
  borderRadius: 50,
  justifyContent: 'center',
  alignItems: 'center',
  borderStyle: 'solid',
  borderColor: 'rgba(255,255,255,0.5)',
  borderWidth: 0.01
};


export default class VR extends React.Component {
  constructor(props) {
    super(props);

    this.sTransleteY = 1;
    this.mScale = 0.028;
    this.mTranslateScale = 1 / this.mScale;
    this.mRotateFix = 200;
    this.interval = 300;
    this.panoramas = ['default', 'hawaii.jpg', 'fort_night.jpg'];

    this.state = {
      currentUser: {
        id: '',
        name: this.props.userName || 'Name',
        scene: 'default',
        translate: [0, 0, 0],
        rotate: [0, 0, 0],
      },
      users: [],
      availableLocations: [true, true, true, true],
      locations: DEFAULT_LOCATIONS,
      animationWidth: DEFAULT_ANIMATION_BUTTON_SIZE,
      animationRadius: DEFAULT_ANIMATION_BUTTON_RADIUS
    };

    this.onNavigationClick = this.onNavigationClick.bind(this);
    this.animatePointer = this.animatePointer.bind(this);

    // this.socket = io('http://localhost:3000');
    this.socket = io('https://vr-room.herokuapp.com');
  }


  componentWillMount() {
    this.socket.on('user connected', (data) => {
      if (this.state.currentUser.id) {
        this.setState({ ...this.state, users: data.users });
      } else {
        // set available locations for current user
        let loc = this.getLocations(data.currentUser.translate);

        data.currentUser.name = this.props.userName;

        this.setState({
          ...this.state, ...data, locations: loc
        }, () => {
          this.socket.emit('pass user name', this.state.currentUser, this.props.userName);
        });
      }
    });

    this.socket.on('pass user name callback', (users) => {
      this.setState({ ...this.state, users: users });
    });

    this.socket.on('user disconnected', (users) => {
      this.setState({...this.state, users: users});
    });
  }


  componentDidMount() {
    // VrHeadModel rotation listener
    this.eventHeadRotation();

    this.socket.on('user rotated callback', (users) => {
      this.setState({ ...this.state, users: users });
    });

    this.socket.on('user moved callback', (users) => {
      this.setState({ ...this.state, users: users });
    });

    this.animatePointer();
  }


  componentWillUnmount() {
    clearTimeout(this.timerId);
    this.socket.removeAllListeners();

    if (this.frameHandle) {
      cancelAnimationFrame(this.frameHandle);
      this.frameHandle = null;
    }
  }


  eventHeadRotation = () => {
    let that = this;
    setTimeout(function tick() {
      if (that.state.currentUser.id) {
        let rotation = VrHeadModel.rotation();

        // if user's Y coordinate has been changed
        if ( rotation[1] !== that.state.currentUser.rotate[1] ) {
          let currentUserNew = {...that.state.currentUser};
          currentUserNew.rotate = [...rotation];

          let usersNew = [...that.state.users];

          for (let i = 0; i < usersNew.length; i++) {
            if (usersNew[i].id === currentUserNew.id) {
              usersNew[i].rotate = [...rotation];
              break;
            }
          }

          that.setState({
            ...that.state,
            currentUser: currentUserNew,
            users: usersNew
          }, () => {
            let data = {id: that.state.currentUser.id, rotate: rotation};
            that.socket.emit('user rotated', data);
          });
        }
      }

      that.timerId = setTimeout(tick, that.interval);
    }, that.interval);
  };


  getLocations = (translate) => {
    let loc = [];
    loc[0] = [translate[0], translate[1], translate[2] - STEP];
    loc[1] = [translate[0] - STEP, translate[1], translate[2]];
    loc[2] = [translate[0], translate[1], translate[2] + STEP];
    loc[3] = [translate[0] + STEP, translate[1], translate[2]];

    return loc;
  };


  onNavigationClick(e, newLocation) {
    cancelAnimationFrame(this.frameHandle);
    this.state.animationWidth = DEFAULT_ANIMATION_BUTTON_SIZE;
    this.state.animationRadius = DEFAULT_ANIMATION_BUTTON_RADIUS;
    this.animatePointer();

    let loc = this.getLocations(newLocation);

    // check boundaries
    let availableLocations = [true, true, true, true];
    for (let index in loc) {
      for (let coordinate of loc[index]) {
        if (Math.abs(coordinate) >= MAX_AREA) {
          availableLocations[index] = false;
        }
      }
    }

    // prepare for set state
    let users = [...this.state.users],
      currentUser = {...this.state.currentUser};

    for (let i = 0; i < users.length; i++) {
      if (users[i].id === currentUser.id) {
        currentUser.translate = newLocation;
        users[i].translate = newLocation;
        break;
      }
    }

    this.setState({
      ...this.state,
      currentUser: currentUser,
      users: users,
      availableLocations: availableLocations,
      locations: loc
    }, () => {
      // send server user position
      this.socket.emit('user moved', currentUser);
    });
  }


  animatePointer() {
    let delta = this.state.animationWidth + 0.001;
    let radius = this.state.animationRadius + 10;
    if(delta >= 0.13){
      delta = DEFAULT_ANIMATION_BUTTON_SIZE;
      radius = DEFAULT_ANIMATION_BUTTON_RADIUS;
    }
    this.setState({...this.state, animationWidth: delta, animationRadius: radius});
    this.frameHandle = requestAnimationFrame(this.animatePointer);
  }

  onPanoClick(e) {
    let currentUser = {...this.state.currentUser};
    let idx = this.panoramas.indexOf(currentUser.scene);

    if (idx > -1) {
      idx++;
      console.log(this.panoramas.length - 1);
      if (idx > this.panoramas.length - 1) {
        idx = 0;
      }
      currentUser.scene = this.panoramas[idx];
    } else {
      currentUser.scene = this.panoramas[0];
    }

    this.setState({...this.state, currentUser: currentUser})
  }


  render() {
    let scene = this.state.currentUser.scene;
    let translate = this.state.currentUser.translate;

    let sceneStyle = {
      transform: [
        {translate: [translate[0], this.sTransleteY, translate[2]]}
      ]
    };

    return (
      <View>
        <Scene style={sceneStyle}/>
        <AmbientLight intensity={1} style={{color: '#fff'}}/>

        {scene === 'default' ? (
          <Pano source={{uri: '/static_assets/scenes/commercial_area.jpg'}}/>
        ) : (
          <Pano source={{uri: `/static_assets/scenes/${scene}`}}/>
        )}

        <VrButton
          onClick={(e) => this.onPanoClick(e)}
          style={{
            layoutOrigin: [0.5, 0.5],
            borderRadius: 0.02,
            borderWidth: 0.005,
            borderColor: '#479044',
            transform: [
              {translate: [2, 1, 0]},
              {rotateY: -90}
            ]
          }}>
          <Text
            style={textStyle}>
            Change panorama
          </Text>
        </VrButton>

        {this.state.users.map(user => {
          let mTranslate = [
            user.translate[0] * this.mTranslateScale,
            user.translate[1] * this.mTranslateScale,
            user.translate[2] * this.mTranslateScale
          ];
          let mRotateY = user.rotate[1] + this.mRotateFix;
          return (
            <View key={user.id}>
              {user.id !== this.state.currentUser.id &&
                <View style={{
                  borderRadius: 0.02,
                  borderWidth: 0.005,
                  borderColor: '#479044',
                  layoutOrigin: [0.5, 0.5],
                  transform: [
                    {translate: [user.translate[0], 0.95, user.translate[2]]},
                    {rotateY: user.rotate[1] + 180}
                  ],
                }}>
                  <Text
                    style={textStyle}>
                    {user.name}
                  </Text>
                </View>
              }

              <Model
                source={{
                  obj: '/static_assets/models/sonic/sonic-the-hedgehog.obj',
                  mtl: '/static_assets/models/sonic/sonic-the-hedgehog.mtl'
                }}
                style={{
                  transform: [
                    {scale: this.mScale},
                    {translate: [mTranslate[0], mTranslate[1], mTranslate[2]]},
                    {rotateY: mRotateY},
                  ]
                }}
                lit
                wireframe={false}
              />
            </View>
          );
        })}

        {this.state.locations.map((location, index) => {
          return (
            <View key={'location' + index}>
              {this.state.availableLocations[index] &&
                <VrButton
                  onClick={(e, newLocation = location) => this.onNavigationClick(e, newLocation)}
                  style={[
                    buttonStyle,
                    {
                      transform: [
                        {translate: [location[0], location[1], location[2]]},
                        {rotateX: 90}
                      ]
                    }
                  ]}>
                  <VrButton
                    style={{
                      width: this.state.animationWidth,
                      height: this.state.animationWidth,
                      borderRadius: this.state.animationRadius,
                      backgroundColor: 'rgba(255,255,255,0.7)'
                    }}>
                  </VrButton>
                </VrButton>
              }
            </View>
          )
        })}
      </View>
    );
  }
};

AppRegistry.registerComponent('VR', () => VR);