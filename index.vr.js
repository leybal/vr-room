import React from 'react';
import {
  AppRegistry,
  asset,
  Pano,
  View,
  AmbientLight,
  Scene,
  Model,
  VrHeadModel
} from 'react-vr';


import io from 'socket.io-client';


export default class VR extends React.Component {
  constructor(props) {
    super(props);

    this.sTransleteY = 1;
    this.mScale = 0.028;
    this.mTranslateScale = 1 / this.mScale;
    this.mRotateFix = 190;
    this.interval = 500;

    this.state = {
      currentUser: {
        id: '',
        scene: 'default',
        translate: [0, 0, 0],
        rotate: [0, 0, 0]
      },
      users: []
    };

    this.socket = io('http://localhost:3000');
  }


  componentWillMount() {
    this.socket.on('user connected', (data) => {
      if (this.state.currentUser.id) {
        this.setState({
          users: data.users
        });
      } else {
        this.setState({...data});
      }
    });

    this.socket.on('user disconnected', (users) => {
      this.setState({...this.state, users: users});
    });
  }


  componentDidMount() {
    this.intervalId = setInterval(() => {
      let rotation = [0, 0, 0];
      if (this.state.currentUser.id) rotation = VrHeadModel.rotation();

      let currentUserNew = {...this.state.currentUser};
      currentUserNew.rotate = [...rotation];

      let usersNew = [...this.state.users];

      for (let i = 0; i < usersNew.length; i++) {
        if (usersNew[i].id === currentUserNew.id) {
          usersNew[i].rotate = [...rotation];
          break;
        }
      }

      this.setState({
        currentUser: currentUserNew,
        users: usersNew
      }, () => {
        let data = {id: this.state.currentUser.id, rotate: rotation};
        this.socket.emit('user rotated', data);
      });
    }, this.interval);

    this.socket.on('user rotated callback', (users) => {
      this.setState({
        users: users
      });
    });
  }


  componentWillUnmount() {
    clearInterval(this.intervalId);
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

        <AmbientLight intensity={1}
          style={{color: '#fff'}}
        />

        {scene === 'default' ? (
          <Pano source={{uri: '/scenes/battleship_bay.png'}}/>
        ) : (
          <Pano source={{uri: '/scenes/chess-world.jpg'}}/>
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
                obj: '/models/sonic/sonic-the-hedgehog.obj',
                mtl: '/models/sonic/sonic-the-hedgehog.mtl'
              }}
              style={{
                transform: [
                  {scale: this.mScale},
                  {translate: [mTranslate[0], mTranslate[1], mTranslate[2]]},
                  {rotateY: mRotateY},
                ]
              }}
              wireframe={false}
            />
          );
        })}
      </View>
    );
  }
};

AppRegistry.registerComponent('VR', () => VR);