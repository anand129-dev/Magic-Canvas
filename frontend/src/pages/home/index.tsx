import { useRef, useState, useEffect } from 'react';
import {SWATCHES} from '@/constants';
import { ColorSwatch, Group } from '@mantine/core';
import { Button } from '@/components/ui/button';
import Draggable from 'react-draggable';

import axios from 'axios';

interface Response {
    expr : string;
    result : string;
    assign : boolean;
}

interface GeneratedResult{
    expression : string;
    answer : string;
}

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const[isDrawing, setIsDrawing] = useState(false);
    const[color, setColor] = useState('rgb(255,255,255)');
    const[reset, setReset] = useState(false);
    const[result, setResult] = useState<GeneratedResult>();
    const[latexExpression, setLatexExpression] = useState<Array<string>>([]);
    const[latextPosition, setLatexPosition] = useState({x:10, y:200});
    const[dictOfVars, setDictOfVars] = useState({});


    useEffect(() => {
        if(reset){
            resetCanvas();
            setLatexExpression([]);
            setResult(undefined);
            setDictOfVars({});
            setReset(false);
        }
    } ,[reset]);


    useEffect(()=> {
        if(result) {
            renderLatexToCanvas(result.expression, result.answer)
        }
    }, [result])

    useEffect(() => {
        if(latexExpression.length > 0 && window.MathJax) {
            setTimeout(()=> {
                window.MathJax.Hun.Queue(["Typeset", window.MathJax.Hub]);
            }, 0)
        }
    }, [latexExpression])

    useEffect(() => {
        const canvas = canvasRef.current;

        if(canvas){
            const ctx = canvas.getContext('2d');
            if(ctx){
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                ctx.lineCap = 'round';
                ctx.lineWidth = 3;
            }
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: {inlineMath: [['$', '$'], ['\\(', '\\)']]},
            });
        };

        return () => {
            document.head.removeChild(script);
        };
    },[]);

    const renderLatexToCanvas = (expression: string, answer: string) => {
        const latex = `\\(\\LARGE{${expression}=${answer}}\\)`;
        setLatexExpression([...latexExpression, latex]);

        const canvas = canvasRef.current;
        if(canvas) {
            const ctx = canvas.getContext('2d');
            if(ctx) {
                ctx.clearRect(0,0, canvas.width, canvas.height);
            }
        }
    }

    const sendData = async () => {
        const canvas = canvasRef.current;

        if(canvas){
            console.log('Sending data...', `${import.meta.env.VITE_API_URL}/calculate`);
            const response = await axios({
                method: 'post',
                url: `${import.meta.env.VITE_API_URL}/calculate`,
                data: {
                    image: canvas.toDataURL('image/png'),
                    dict_of_vars: dictOfVars,
                }
            });
            const resp = await response.data;
            resp.data.forEach((data :Response) => {
                if(data.assign === true) {
                    setDictOfVars({
                        ...dictOfVars,
                        [data.expr]: data.result
                    })
                }
            })

        const ctx = canvas.getContext('2d');
        const imageData = ctx!.getImageData(0,0, canvas.width, canvas.height);
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

        for(let y=0; y < canvas.height; y++){  
            for(let x=0; x < canvas.width; x++){
                if(imageData.data[(y * canvas.width + x) * 4 + 3] > 0) {
                    if(x < minX) minX = x;
                    if(x > minX) minX = x;
                    if(y < minY) minY = y;
                    if(y > minY) minY = y;

                }
            }
        }
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        setLatexPosition({x: centerX, y: centerY});

        resp.data.forEach((data: Response) => {
            setTimeout(() => {
                setResult({
                    expression:data.expr,
                    answer: data.result
                });
            });
        }, 200);
    }
};

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if(canvas){
            const ctx = canvas.getContext('2d');
            if(ctx){
                ctx.clearRect(0,0, canvas.width, canvas.height);
            }
        }
    }

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if(canvas) {
            canvas.style.background = 'black';
            const ctx = canvas.getContext('2d');
            if(ctx){
                ctx.beginPath();
                ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                setIsDrawing(true);
            }
        }
    }

    const stopDrawing = () => {
        setIsDrawing(false);
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if(!isDrawing){
            return;
        }
        const canvas = canvasRef.current;
        if(canvas){
            const ctx = canvas.getContext('2d');
            if(ctx){
                ctx.strokeStyle = color;
                ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                ctx.stroke();
            }
        }
    }

    return (
        <>
            
            <div className='grid grid-cols-3 gap-2 m-3'>
                <Button
                    onClick={() => setReset(true)}
                    className='z-20 bg-red-500 text-white hover:bg-gray-700 w-16 mr-auto px-4 '
                    variant='default'
                    // color='black'
                >
                    Reset
                </Button>
                <Group className='z-20'>
                    {SWATCHES.map((swatchColor: string) => (
                        <ColorSwatch
                            key={swatchColor}
                            color={swatchColor}
                            onClick={()=>setColor(swatchColor)}
                            />
                    ))}
                </Group>
                <Button
                    onClick={sendData}
                    className='z-20 bg-green-500 text-white hover:bg-gray-700 w-16 ml-auto'
                    variant='default'
                    color='black'
                >
                    Run
                </Button>
            </div>
            <canvas
                ref = {canvasRef}
                id='canvas'
                className='absolute top-0 left-0 w-full h-full bg-black'
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseOut={stopDrawing}
                onMouseUp={stopDrawing}
            />

            {latexExpression && latexExpression.map((latex, index) => (
                <Draggable
                    key={index}
                    defaultPosition={latextPosition}
                    onStop={(e, data) => setLatexPosition({x:data.x, y:data.y})}
                >
                    <div className='absolute text-white'>
                   
                        <div className='latext-content'>
                            {latex}
                        </div>
                     </div>
                </Draggable>
            ))}
        </>
    );
}

