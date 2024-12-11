import { useRef, useState, useEffect } from "react";
import { SWATCHES } from "@/constants";
import { ColorSwatch, Group } from "@mantine/core";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider"
import Draggable from "react-draggable";
import React from 'react';  // Add this import

import axios from "axios";

//Response interface (structure to returned as reponse)
interface Response {
    expr: string;
    result: string;
    assign: boolean;
}

//In TS, interface is a way to define the structure of an object

//Interface to define the structure of the GeneratedResult
interface GeneratedResult {
    expression: string;
    answer: string;
}

// Define props for the StrokeSizeControl component
interface StrokeSizeControlProps {
    onStrokeSizeChange: (size: number) => void;
  }

//Default React export function
export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null); //useRef(React hook for mutable reference object) & null(intial valuse)

    // const [value, setValue] => Array destructuring (To unpack values from array or properties from objects into distinct variables)
    const [isDrawing, setIsDrawing] = useState(false); //useState (React hook) => On render (isDrawing = false)
    const [color, setColor] = useState("rgb(255,255,255)"); //'rgb(255,255,255)' => String intial value
    const [reset, setReset] = useState(false);
    const [result, setResult] = useState<GeneratedResult>(); //GeneratedResult> specifies that the state variable result will hold an object of type GeneratedResult. And the initial value is undefined.
    const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
    const [latextPosition, setLatexPosition] = useState({ x: 10, y: 200 });
    const [dictOfVars, setDictOfVars] = useState({}); //Initial Value: Empty Object
    const [strokeSize, setStrokeSize] = useState(3);
    const [isErasing, setIsErasing] = useState(false);

    //Arrow function () => {}
    //Syntax : (Parameters) => {Operations}

    //Use Effect Hook (React Hook for handling side effects): Runs when the dependencies change.
    //Use Effect Syntax: useEffect(() => {Operations}, [Dependencies])
    useEffect(() => {
        if (reset) {
            resetCanvas();
            setLatexExpression([]);
            setResult(undefined);
            setDictOfVars({});
            setReset(false);
        }
    }, [reset]);

    useEffect(() => {
        if (result) {
            renderLatexToCanvas(result.expression, result.answer);
        }
    }, [result]);

    useEffect(() => {
        if (latexExpression.length > 0 && window.MathJax) {
            //window.MathJax => Checks if MathJax Object is available on the window (i.e. it is rendered and ready for use)
            //setTimeout(function, delay) => Function to be executed after a specified delay (Javascipt Function)
            setTimeout(() => {
                window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExpression]);

    //useEffect with Empty Array Dependencie => Executes the code only once when the component is first rendered
    useEffect(() => {
        const canvas = canvasRef.current;

        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                ctx.lineCap = "round";
                ctx.lineWidth = strokeSize;
            }
        }
        const script = document.createElement("script");
        script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML";
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: {
                    inlineMath: [
                        ["$", "$"],
                        ["\\(", "\\)"],
                    ],
                },
            });
        };

        return () => {
            document.head.removeChild(script);
        };
    }, []);

    //Function to Handle Stroke Width
    const handleStrokeSize = (value) => {
        setStrokeSize(value);    // Since the slider value is passed as an array, we take the first element
    }

    

    //Function renderLLatexToCanvas
    const renderLatexToCanvas = (expression: string, answer: string) => {
        const latex = `\\(\\LARGE{${expression}=${answer}}\\)`;
        setLatexExpression([...latexExpression, latex]); //Spread Operator(...) => Used to create a new array that includes all existing elements in latexExpression and append new latex string on it.
        //The spread operator (...) is used to unpack elements from an array or object and copy them into a new array or object, allowing you to add, modify, or merge elements without altering the original data.
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

    const sendData = async () => {
        const canvas = canvasRef.current;

        if (canvas) {
            console.log(
                "Sending data...",
                `${import.meta.env.VITE_API_URL}/calculate`
            );
            const response = await axios({
                method: "post",
                url: `${import.meta.env.VITE_API_URL}/calculate`,
                data: {
                    image: canvas.toDataURL("image/png"),
                    dict_of_vars: dictOfVars,
                },
            });
            const resp = await response.data;
            resp.data.forEach((data: Response) => {
                if (data.assign === true) {
                    setDictOfVars({
                        ...dictOfVars,
                        [data.expr]: data.result,
                    });
                }
            });

            const ctx = canvas.getContext("2d");
            const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
            let minX = canvas.width,
                minY = canvas.height,
                maxX = 0,
                maxY = 0;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    if (imageData.data[(y * canvas.width + x) * 4 + 3] > 0) {
                        if (x < minX) minX = x;
                        if (x > minX) minX = x;
                        if (y < minY) minY = y;
                        if (y > minY) minY = y;
                    }
                }
            }
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            setLatexPosition({ x: centerX, y: centerY });

            resp.data.forEach((data: Response) => {
                setTimeout(() => {
                    setResult({
                        expression: data.expr,
                        answer: data.result,
                    });
                });
            }, 200);
        }
    };

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

    //Function to start drawing lines on the canvas
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.style.background = "black";
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.beginPath();
                ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                setIsDrawing(true);
            }
        }
    };

    //Function to stop drawing lines when isDrawing is false
    const stopDrawing = () => {
        setIsDrawing(false); // isDrawing => false
    };

    //Function to drawlines when using mouse (but only when the isDrawing is true)
    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) {
            //Checks if the drawing mode is off => Stops the function
            return;
        }
        const canvas = canvasRef.current; //Gets the current canvas element from a Referece (canvasRef)
        if (canvas) {
            //Checks if the canvas exists
            const ctx = canvas.getContext("2d"); //Gets the 2d drawing context on the canvas
            if (ctx) {
                //Checks if the context is valid
                ctx.strokeStyle = isErasing ? "black" : color; // Use black color for erasing //Sets the color of the stroke
                ctx.lineWidth = strokeSize;

                
                ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); //Draws a line to mouse's current position
                ctx.stroke(); //Renders the line on the canvas
            }
        }
    };

    return (
        <>
            <div className="flex flex-col h-screen bg-black">
                {/* Header Row */}
                <div className="flex flex-wrap justify-center items-center p-2 bg-black">

                    {/* Reset Button */}
                    <Button className="z-20 bg-red-500 text-white hover:bg-gray-700 w-16 mr-auto px-4 "
                        onClick={() => setReset(true)}
                        variant="default">
                        Reset
                    </Button>

                    {/* Color Group */}
                    <Group className="z-20 flex-wrap justify-center m-auto"
                        >
                        {SWATCHES.map((swatchColor: string) => (
                            <ColorSwatch
                                key={swatchColor}
                                color={swatchColor}
                                onClick={() => setColor(swatchColor)}
                            />
                        ))}
                    </Group>

                    {/* Erase Button */}
                    <Button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-primary/90 h-10 px-4 py-2 z-20 bg-gray-500 text-white m-auto w-24"
                    onClick={() => setIsErasing(!isErasing)}>
                         {isErasing ? "Stop Erasing" : "Erase"}
                    </Button>

                    {/* Slider Component */}
                    <div className="flex items-center space-x-2 bg-gray-700 p-2 rounded m-auto">
                        {/* Pencil Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil text-white"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path><path d="m15 5 4 4"></path></svg>
                        {/* Slider */}
                        <Slider
                            className="cursor-pointer w-32"
                            value={[strokeSize]}  // Bind the slider value to the strokeSize state
                            onValueChange={(value) => handleStrokeSize(value)}  // Call function to handle changes
                            defaultValue={[strokeSize]} min= {1} max={20} step={1} />
                        {/* Stroke Size */}
                        <span className="text-white w-12">{strokeSize} px</span>
                    </div>

                    {/* Calculate button */}
                    <Button
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-primary/90 h-10 px-4 py-2 z-20 bg-green-500 text-white m-1"
                        onClick={sendData}
                        variant="default"
                        color="black"
                    >
                        Calculate
                    </Button>                

                </div>

                {/* Main Canvas */}
                <div className="relative flex-grow">
                    <canvas
                        ref={canvasRef}
                        id="canvas"
                        className="absolute top-0 left-0 w-full h-full bg-black"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseOut={stopDrawing}
                        onMouseUp={stopDrawing}
                    />

                    {latexExpression &&
                        latexExpression.map((latex, index) => (
                            <Draggable
                                key={index}
                                defaultPosition={latextPosition}
                                onStop={(e, data) => setLatexPosition({ x: data.x, y: data.y })}
                            >
                                <div className="absolute text-white">
                                    <div className="latext-content">{latex}</div>
                                </div>
                            </Draggable>
                        ))}
                </div>
            </div>
        </>
    );

}