import React from 'react';
import {
  AppRegistry,
  Pano,
  View,
  AmbientLight,
  Scene,
  Model,
  VrHeadModel,
  Animated
} from 'react-vr';

import io from 'socket.io-client';


export default class VR extends React.Component {
  constructor(props) {
    super(props);

    this.sTransleteY = 1;
    this.mScale = 0.028;
    this.mTranslateScale = 1 / this.mScale;
    this.mRotateFix = 200;
    this.interval = 100;

    this.state = {
      currentUser: {
        id: '',
        scene: 'default',
        translate: [0, 0, 0],
        rotate: [0, 0, 0],
      },
      users: [],
      yRotation: new Animated.Value(0)
    };

    //this.socket = io('http://localhost:3000');
    this.socket = io('https://vr-room.herokuapp.com');

  }


   componentWillMount() {
    this.socket.on('user connected', (data) => {
      if (this.state.currentUser.id) {
        this.setState({ ...this.state, users: data.users });
      } else {
        this.setState({ ...this.state, ...data });
      }
    });

    this.socket.on('user disconnected', (users) => {
      this.setState({...this.state, users: users});
    });
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


  componentDidMount() {
    // VrHeadModel rotation listener
    this.eventHeadRotation();

    this.socket.on('user rotated callback', (users) => {
      this.setState({ ...this.state, users: users });
    });
  }

  componentWillUpdate(nextProps, nextState) {
    // Animated.timing(nextState.yRotation, {
    //   duration: this.interval,
    //   toValue: nextState.users[0].rotate[1] + this.mRotateFix,
    // }).start();
  }


  componentWillUnmount() {
    clearTimeout(this.timerId);
    this.socket.removeAllListeners();
  }


  render() {
    let scene = this.state.currentUser.scene;
    let translate = this.state.currentUser.translate;

    let sceneStyle = {
      transform: [
        {translate: [translate[0], this.sTransleteY, translate[2]]}
      ]
    };


    console.log('RENDER');

    return (
      <View>
        <Scene style={sceneStyle}/>
        <AmbientLight intensity={1}
          style={{color: '#fff'}}
        />

        {scene === 'default' ? (
          <Pano source={{uri: '/static_assets/scenes/commercial_area_cam_v004.jpg'}}/>
        ) : (
          <Pano source={{uri: `/static_assets/scenes/${scene}`}}/>
        )}

        {this.state.users.map(user => {
          let mTranslate = [
            user.translate[0] * this.mTranslateScale,
            user.translate[1] * this.mTranslateScale,
            user.translate[2] * this.mTranslateScale
          ];
          let mRotateY = user.rotate[1] + this.mRotateFix;
          return (
            <Model
              key={user.id}
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
          );
        })}
      </View>
    );
  }
};

AppRegistry.registerComponent('VR', () => VR);